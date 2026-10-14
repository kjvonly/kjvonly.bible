import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { validateManifest } from '#domain/manifest/manifest.js';
import type { ImportSourceFile } from '../classification/filesystem-import-classifier.js';
import type { FilesystemSemanticImportResolver } from '../resolution/filesystem-semantic-import-resolver.js';
import type { SemanticTypeDefinition } from '../../semantic/semantic-type-registry.js';
import { createDefaultFileFormatRegistry } from '../format/file-format-registry.js';
import { GenericFileResourceDefinitionBuilder } from './generic-file-resource-definition-builder.js';
import {
	FilesystemFileCompilerRegistry,
	GenericFileCompiler,
	NormalizedDocumentFileCompiler
} from './filesystem-file-compiler-registry.js';
import { FilesystemImportManifestCompiler } from './filesystem-import-manifest-compiler.js';
import { filesystemImportManifestName } from './filesystem-import-manifest-definition.js';
import { NormalizedDocumentResourceDefinitionBuilder } from './normalized-document-resource-definition-builder.js';

const directory = '/tmp/app-files';
const filesystemRoot = 'app-filesystem';
const manifest = validateManifest({
	version: 1, kind: 37770, staging: { path: '.staging' },
	nostr: { relays: ['ws://localhost:3334'] },
	defaults: { strategy: 'local' },
	strategies: { local: { type: 'blossom', urls: ['http://localhost:3335'] } }
});
const semantic: SemanticTypeDefinition = {
	dataType: 'kjvonly.normalized-document',
	dataVersion: 1,
	resourceType: 'normalized-content/document',
	objectType: 'normalized-content/document',
	validate: () => {}
};

function file(relativePath: string, size = 100): ImportSourceFile {
	return { sourcePath: resolve(directory, relativePath), relativePath, size };
}
function fixture(resolution: 'semantic' | 'unvalidated' = 'semantic') {
	const resolveSemantic = vi.fn(async () => resolution === 'semantic'
		? ({ kind: 'semantic' as const, definition: semantic })
		: ({ kind: 'unvalidated' as const, failures: [{ dataType: semantic.dataType, cause: new Error('bad document') }] }));
	const reader = vi.fn(() => ({ readPrefix: async () => new Uint8Array(), readAll: async () => new Uint8Array() }));
	const normalized = new NormalizedDocumentResourceDefinitionBuilder();
	const formats = createDefaultFileFormatRegistry();
	const registry = new FilesystemFileCompilerRegistry([
		new NormalizedDocumentFileCompiler(
			{ resolve: resolveSemantic } as unknown as FilesystemSemanticImportResolver,
			reader,
			normalized,
			formats
		),
		new GenericFileCompiler(new GenericFileResourceDefinitionBuilder(formats))
	]);
	return { compiler: new FilesystemImportManifestCompiler(registry), normalized, resolveSemantic, reader };
}
function tag(resource: { event: { tags: string[][] } }, name: string): string | undefined {
	return resource.event.tags.find(pair => pair[0] === name)?.[1];
}
function request(files: readonly ImportSourceFile[]) {
	return { directory, filesystemRoot, manifest, files };
}

describe('filesystem per-file compiler registry', () => {
	it('dispatches by extension and builds one mixed Filesystem preserving original document identities', async () => {
		const { compiler, normalized, resolveSemantic } = fixture();
		const chapter = file('commentaries/Genesis-1.nd.json', 200);
		const mixed = await compiler.compile(request([
			file('books/manual.docx'), file('sermons/sermon.mp3'), file('archive/mystery.unknown'), chapter
		]));
		const expected = normalized.build({ directory, filesystemRoot, manifest,
			file: chapter, definition: semantic, format: createDefaultFileFormatRegistry().resolve(chapter.relativePath) });
		const { name, definition } = expected;
		expect(mixed.resources[name]).toEqual(definition);
		expect(resolveSemantic).toHaveBeenCalledTimes(1);
		expect(Object.keys(mixed.resources)).toHaveLength(4);
		const values = Object.values(mixed.resources);
		expect(tag(values.find(value => tag(value, 'dataType') === 'kjvonly.audio')!, 't')).toBe('media/audio');
		expect(values.find(value => value.path === 'books/manual.docx')?.['object-upload']?.mediaType)
			.toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
		expect(values.find(value => value.path === 'archive/mystery.unknown')?.['object-upload']?.mediaType)
			.toBe('application/octet-stream');
		expect(Object.keys(mixed.filesystems)).toEqual([filesystemImportManifestName(filesystemRoot)]);
		const paths = Object.values(mixed.filesystems)[0]?.directories.flatMap(entry => Object.keys(entry.resources).map(name => `${entry.path}/${name}`)) ?? [];
		expect(paths).toHaveLength(4);
	});

	it('routes case-insensitive .nd.json to semantic strategy, never to opaque fallback', async () => {
		const { compiler, resolveSemantic } = fixture();
		const compiled = await compiler.compile(request([file('Chapter.ND.JSON')]));
		expect(resolveSemantic).toHaveBeenCalledOnce();
		expect(tag(Object.values(compiled.resources)[0]!, 'dataType')).toBe('kjvonly.normalized-document');
	});

	it('rejects invalid explicit Normalized Documents instead of publishing them as blobs', async () => {
		const { compiler } = fixture('unvalidated');
		await expect(compiler.compile(request([file('books/bad.nd.json'), file('audio.mp3')]))).rejects.toThrow('bad document');
	});

	it('validates and preserves pre-gzipped semantic documents as external artifacts', async () => {
		const { compiler, resolveSemantic, reader } = fixture();
		const result = await compiler.compile(request([file('book.nd.json.gz', 30)]));
		expect(resolveSemantic).toHaveBeenCalledOnce();
		expect(reader).toHaveBeenCalledWith(resolve(directory, 'book.nd.json.gz'), ['gzip']);
		const resource = Object.values(result.resources)[0]!;
		expect(resource['object-upload']).toEqual({ mediaType: 'application/json+gzip', encoding: [] });
		expect(tag(resource, 'representation')).toBe('descriptors');
		expect(tag(resource, 'd')).toBe('kjvonly/normalized-content/documents/app-filesystem/book.nd.json.gz');
	});

	it('preserves already gzipped media bytes and keeps all generic media external', async () => {
		const { compiler } = fixture();
		const result = await compiler.compile({ ...request([file('audio.mp3.gz'), file('book.pdf')]), inlineLimitBytes: 0 });
		expect(result.resources[Object.keys(result.resources)[0]!]!['object-upload']).toEqual({ mediaType: 'audio/mpeg+gzip', encoding: [] });
		expect(Object.values(result.resources).every(resource => !!resource['object-upload'])).toBe(true);
	});

	it('is deterministic and rejects duplicate paths, invalid roots and empty lists', async () => {
		const { compiler } = fixture();
		const files = [file('z.zip'), file('a.pdf'), file('b.odt')];
		expect(await compiler.compile(request(files))).toEqual(await compiler.compile(request([...files].reverse())));
		await expect(compiler.compile(request([file('same.pdf'), file('same.pdf')]))).rejects.toThrow('Duplicate import path');
		await expect(compiler.compile(request([]))).rejects.toThrow('No files');
		await expect(compiler.compile({ ...request(files), filesystemRoot: '../unsafe' })).rejects.toThrow('Invalid Filesystem root');
	});

	it('rejects duplicate compiler names', () => {
		const fallback = new GenericFileCompiler(new GenericFileResourceDefinitionBuilder(createDefaultFileFormatRegistry()));
		expect(() => new FilesystemFileCompilerRegistry([fallback, fallback])).toThrow('duplicate');
	});
});

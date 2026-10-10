import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { validateManifest } from '#domain/manifest/manifest.js';
import type { ImportSourceFile } from '../classification/filesystem-import-classifier.js';
import type { SemanticTypeDefinition } from '../../semantic/semantic-type-registry.js';
import { NormalizedDocumentManifestCompiler } from './normalized-document-manifest-compiler.js';

const root = '/example/content';
const definition: SemanticTypeDefinition = {
	dataType: 'kjvonly.normalized-document',
	dataVersion: 1,
	resourceType: 'normalized-content/document',
	objectType: 'normalized-content/document',
	validate: () => {}
};
const base = validateManifest({
	version: 1,
	kind: 37770,
	staging: { path: '.staging' },
	nostr: { relays: ['wss://relay.example'] },
	defaults: { strategy: 'main' },
	strategies: { main: { type: 'blossom', urls: ['https://blossom.example'] } }
});

function document(path: string, size = 123, dataVersion = 1) {
	const file: ImportSourceFile = {
		sourcePath: resolve(root, path),
		relativePath: path,
		size
	};
	return { file, definition: { ...definition, dataVersion } };
}

function compile(documents = [document('books/pilgrim.nd.json')], overrides = {}) {
	return new NormalizedDocumentManifestCompiler().compile({
		directory: root,
		filesystemRoot: 'library',
		manifest: base,
		documents,
		...overrides
	});
}

describe('NormalizedDocumentManifestCompiler', () => {
	it('compiles one document into a validated Resource and selective Filesystem placement', () => {
		const manifest = compile();
		const [name, resource] = Object.entries(manifest.resources)[0]!;
		expect(name).toMatch(/^normalized-document-[a-f0-9]{64}$/);
		expect(resource.path).toBe('books/pilgrim.nd.json');
		expect(resource.event.encoding).toEqual(['gzip', 'hex']);
		expect(Object.fromEntries(resource.event.tags)).toMatchObject({
			d: 'kjvonly/normalized-content/documents/library/books/pilgrim.nd.json',
			m: 'application/json+gzip+hex',
			t: 'normalized-content/document',
			dataType: 'kjvonly.normalized-document',
			dataVersion: '1',
			representation: 'content'
		});
		expect(resource['object-upload']).toBeUndefined();
		const filesystem = Object.values(manifest.filesystems)[0]!;
		expect(filesystem.root).toBe('library');
		expect(Object.fromEntries(filesystem.event.tags)).toMatchObject({
			d: 'kjvonly/filesystem/library',
			t: 'filesystem/entry',
			dataType: 'kjvonly.filesystem.entries',
			representation: 'content'
		});
		expect(filesystem.directories).toEqual([{
			path: 'books',
			resources: { 'pilgrim.nd.json': { resource: name, key: 'pilgrim' } },
			collections: {}
		}]);
	});

	it('places all source files at their mirrored paths in a deterministic order', () => {
		const a = compile([document('sermons/z.nd.json'), document('books/a.nd.json')]);
		const b = compile([document('books/a.nd.json'), document('sermons/z.nd.json')]);
		expect(a).toEqual(b);
		expect(Object.values(a.filesystems)[0]?.directories.map(directory => directory.path))
			.toEqual(['books', 'sermons']);
	});

	it('routes large files through existing descriptor-backed object staging', () => {
		const manifest = compile([document('large.nd.json', 1025, 2)], { inlineLimitBytes: 1024 });
		const resource = Object.values(manifest.resources)[0]!;
		expect(resource['object-upload']).toEqual({ mediaType: 'application/json', encoding: [] });
		expect(Object.fromEntries(resource.event.tags)).toMatchObject({
			representation: 'descriptors',
			dataVersion: '2'
		});
	});

	it('preserves given publication settings without mutating the baseline', () => {
		const before = structuredClone(base);
		const result = compile();
		expect(base).toEqual(before);
		expect(result.nostr).toEqual(base.nostr);
		expect(result.strategies).toEqual(base.strategies);
	});

	it('requires a configured external strategy for large files', () => {
		const noStrategy = validateManifest({
			version: 1, kind: 37770, staging: { path: '.staging' },
			nostr: { relays: ['wss://relay.example'] }
		});
		expect(() => compile([document('large.nd.json', 200)], {
			manifest: noStrategy,
			inlineLimitBytes: 10
		})).toThrow('External storage strategy required');
	});

	it('rejects unsafe, duplicate, out-of-root and inconsistent input paths', () => {
		expect(() => compile([document('../bad.nd.json')])).toThrow('canonical descendant');
		expect(() => compile([document('book.nd.json'), document('book.nd.json')])).toThrow('Duplicate import path');
		expect(() => compile([{
			file: { ...document('book.nd.json').file, sourcePath: '/tmp/elsewhere.nd.json' },
			definition
		}])).toThrow('canonical descendant');
		expect(() => compile([document('some\\windows.nd.json')])).toThrow('canonical descendant');
		expect(() => compile([document('.hidden.nd.json')])).toThrow('canonical descendant');
	});

	it('rejects unexpected semantic families and an empty batch', () => {
		expect(() => compile([])).toThrow('No validated');
		expect(() => compile([{ ...document('a.nd.json'), definition: {
			...definition, dataType: 'kjvonly.bible.chapter'
		} }])).toThrow('Non-Normalized Document');
	});
});

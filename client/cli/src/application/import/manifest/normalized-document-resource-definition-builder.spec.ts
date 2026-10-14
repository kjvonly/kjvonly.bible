import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { validateManifest } from '#domain/manifest/manifest.js';
import type { ImportSourceFile } from '../classification/filesystem-import-classifier.js';
import type { SemanticTypeDefinition } from '../../semantic/semantic-type-registry.js';
import { NormalizedDocumentResourceDefinitionBuilder } from './normalized-document-resource-definition-builder.js';
import { createDefaultFileFormatRegistry } from '../format/file-format-registry.js';

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

function compile(path = 'books/pilgrim.nd.json', size = 123, overrides: Record<string, unknown> = {}) {
	const doc = document(path, size);
	return new NormalizedDocumentResourceDefinitionBuilder().build({
		directory: root, filesystemRoot: 'library', manifest: base,
		...doc, format: createDefaultFileFormatRegistry().resolve(path), ...overrides
	});
}

describe('NormalizedDocumentResourceDefinitionBuilder', () => {
	it('preserves the published identity and inline event metadata', () => {
		const result = compile();
		expect(result.name).toMatch(/^normalized-document-[a-f0-9]{64}$/);
		expect(result.filesystemPath).toBe('library/books/pilgrim.nd.json');
		expect(result.definition.path).toBe('books/pilgrim.nd.json');
		expect(result.definition.event.encoding).toEqual(['gzip', 'hex']);
		expect(Object.fromEntries(result.definition.event.tags)).toMatchObject({
			d: 'kjvonly/normalized-content/documents/library/books/pilgrim.nd.json',
			m: 'application/json+gzip+hex', t: 'normalized-content/document',
			dataType: 'kjvonly.normalized-document', dataVersion: '1', representation: 'content'
		});
		expect(result.definition['object-upload']).toBeUndefined();
	});
	it('routes large and zero-limit nonempty documents to raw JSON artifacts', () => {
		for (const [size, limit] of [[1025, 1024], [1, 0]]) {
			const { definition } = compile('large.nd.json', size, { inlineLimitBytes: limit });
			expect(definition['object-upload']).toEqual({ mediaType: 'application/json', encoding: [] });
			expect(Object.fromEntries(definition.event.tags).representation).toBe('descriptors');
		}
	});
	it('preserves pre-gzipped source bytes in Blossom instead of double-compressing inline', () => {
		const { definition, filesystemPath } = compile('books/essay.nd.json.gz', 35, { inlineLimitBytes: 1_000_000 });
		expect(filesystemPath).toBe('library/books/essay.nd.json.gz');
		expect(definition['object-upload']).toEqual({ mediaType: 'application/json+gzip', encoding: [] });
		expect(Object.fromEntries(definition.event.tags)).toMatchObject({
			d: 'kjvonly/normalized-content/documents/library/books/essay.nd.json.gz',
			representation: 'descriptors', m: 'application/json+gzip+hex'
		});
	});
	it('preserves semantic versions and rejects incorrect semantic families', () => {
		const doc = document('a.nd.json', 120, 2);
		const builder = new NormalizedDocumentResourceDefinitionBuilder();
		const valid = builder.build({ directory: root, filesystemRoot: 'library', manifest: base, ...doc, format: createDefaultFileFormatRegistry().resolve(doc.file.relativePath) });
		expect(Object.fromEntries(valid.definition.event.tags).dataVersion).toBe('2');
		expect(() => builder.build({ directory: root, filesystemRoot: 'library', manifest: base,
			...doc, format: createDefaultFileFormatRegistry().resolve(doc.file.relativePath), definition: { ...definition, dataType: 'kjvonly.bible.chapter' }
		})).toThrow('Non-Normalized Document');
	});
	it('requires storage configuration for external objects', () => {
		const noStrategy = validateManifest({ version: 1, kind: 37770,
			staging: { path: '.staging' }, nostr: { relays: ['wss://relay.example'] } });
		expect(() => compile('large.nd.json', 2048, { inlineLimitBytes: 100, manifest: noStrategy }))
			.toThrow('External storage strategy required');
	});
	it('rejects unsafe, out-of-root paths and invalid thresholds', () => {
		expect(() => compile('../bad.nd.json')).toThrow('canonical descendant');
		expect(() => compile('a.nd.json', 5, { file: { ...document('a.nd.json').file, sourcePath: '/elsewhere/a.nd.json' } }))
			.toThrow('canonical descendant');
		expect(() => compile('a.nd.json', 5, { inlineLimitBytes: -1 })).toThrow('nonnegative integer');
	});
});

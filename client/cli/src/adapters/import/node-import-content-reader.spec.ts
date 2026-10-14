import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { NodeImportContentReader } from './node-import-content-reader.js';
import { FilesystemImportClassifier } from '../../application/import/classification/filesystem-import-classifier.js';
import { NormalizedDocumentRecognizer } from '../../application/import/classification/recognizers/normalized-document-recognizer.js';
import { FilesystemSemanticImportResolver } from '../../application/import/resolution/filesystem-semantic-import-resolver.js';
import { SemanticTypeRegistry } from '../../application/semantic/semantic-type-registry.js';
import { createNormalizedDocumentSemanticType } from '../../application/semantic/definitions/normalized-document-semantic-type.js';
import { NormalizedDocumentValidator } from '@kjvonly/normalized-content';

const temporaryPaths: string[] = [];

afterEach(async () => {
	for (const path of temporaryPaths.splice(0)) {
		await rm(path, { recursive: true, force: true });
	}
});

describe('NodeImportContentReader', () => {
	it('reads only the prefix of a large file and can read its complete bytes independently', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'kjvonly-import-'));
		temporaryPaths.push(directory);
		const path = join(directory, 'large.nd.json');
		const body = Buffer.from('{"blocks":[]}' + ' '.repeat(100_000), 'utf8');
		await writeFile(path, body);

		const reader = new NodeImportContentReader(path);
		expect(Buffer.from(await reader.readPrefix(15)).toString('utf8')).toBe(body.subarray(0, 15).toString('utf8'));
		expect(await reader.readPrefix(0)).toHaveLength(0);
		expect(await reader.readPrefix(64 * 1024)).toHaveLength(64 * 1024);
		expect(Buffer.from(await reader.readAll())).toEqual(body);
	});

	it('resolves a real large normalized-document JSON file with the CLI validator', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'kjvonly-import-'));
		temporaryPaths.push(directory);
		const path = join(directory, 'sermon.json');
		const document = '{"blocks":[]}' + ' '.repeat(70_000);
		await writeFile(path, document, 'utf8');
		const validator = new NormalizedDocumentValidator();
		const resolver = new FilesystemSemanticImportResolver(
			new FilesystemImportClassifier([new NormalizedDocumentRecognizer()]),
			new SemanticTypeRegistry([createNormalizedDocumentSemanticType(validator)])
		);
		const result = await resolver.resolve(
			{ sourcePath: path, relativePath: 'sermon.json', size: Buffer.byteLength(document) },
			new NodeImportContentReader(path)
		);
		expect(result.kind).toBe('semantic');
		if (result.kind !== 'semantic') throw new Error('Expected normalized document');
		expect(result.definition).toMatchObject({
			dataType: 'kjvonly.normalized-document',
			dataVersion: 1,
			resourceType: 'normalized-content/document',
			objectType: 'normalized-content/document'
		});
	});

	it('reads bounded decoded gzip prefixes and validates full compressed documents', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'kjvonly-import-gzip-'));
		temporaryPaths.push(directory);
		const path = join(directory, 'chapter.nd.json.gz');
		const original = '{"blocks":[]}' + ' '.repeat(110_000);
		const compressed = gzipSync(Buffer.from(original));
		await writeFile(path, compressed);
		const reader = new NodeImportContentReader(path, ['gzip']);
		expect(Buffer.from(await reader.readPrefix(32)).toString()).toBe(original.slice(0, 32));
		expect(await reader.readPrefix(64 * 1024)).toHaveLength(64 * 1024);
		expect(Buffer.from(await reader.readAll()).toString()).toBe(original);
		expect(await readFile(path)).toEqual(compressed);

		const resolver = new FilesystemSemanticImportResolver(
			new FilesystemImportClassifier([new NormalizedDocumentRecognizer()]),
			new SemanticTypeRegistry([createNormalizedDocumentSemanticType(new NormalizedDocumentValidator())])
		);
		const result = await resolver.resolve(
			{ sourcePath: path, relativePath: 'chapter.nd.json.gz', size: compressed.length },
			reader
		);
		expect(result.kind).toBe('semantic');
	});

	it('fails strict semantic import when the .gz source is corrupted', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'kjvonly-import-bad-gzip-'));
		temporaryPaths.push(directory);
		const path = join(directory, 'invalid.nd.json.gz');
		await writeFile(path, Buffer.from('not a gzip stream'));
		const resolver = new FilesystemSemanticImportResolver(
			new FilesystemImportClassifier([new NormalizedDocumentRecognizer()]),
			new SemanticTypeRegistry([createNormalizedDocumentSemanticType(new NormalizedDocumentValidator())])
		);
		await expect(resolver.resolve(
			{ sourcePath: path, relativePath: 'invalid.nd.json.gz', size: 17 },
			new NodeImportContentReader(path, ['gzip'])
		)).rejects.toThrow('Cannot read import "invalid.nd.json.gz"');
	});

	it('returns the available bytes on a short file and rejects unbounded prefix requests', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'kjvonly-import-'));
		temporaryPaths.push(directory);
		const path = join(directory, 'short.json');
		await writeFile(path, 'abc');
		const reader = new NodeImportContentReader(path);
		expect(new TextDecoder().decode(await reader.readPrefix(100))).toBe('abc');
		await expect(reader.readPrefix(64 * 1024 + 1)).rejects.toThrow('Invalid import prefix size');
		await expect(reader.readPrefix(-1)).rejects.toThrow('Invalid import prefix size');
	});
});

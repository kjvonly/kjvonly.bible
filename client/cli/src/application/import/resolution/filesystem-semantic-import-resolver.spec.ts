import { describe, expect, it, vi } from 'vitest';
import { NormalizedDocumentValidator } from '@kjvonly/normalized-content';
import { FilesystemImportClassifier, type FilesystemImportRecognizer, type ImportSourceFile } from '../classification/filesystem-import-classifier.js';
import { NormalizedDocumentRecognizer } from '../classification/recognizers/normalized-document-recognizer.js';
import { SemanticTypeRegistry, type SemanticTypeDefinition } from '../../semantic/semantic-type-registry.js';
import { createNormalizedDocumentSemanticType } from '../../semantic/definitions/normalized-document-semantic-type.js';
import { FilesystemSemanticImportResolver, type ImportContentReader } from './filesystem-semantic-import-resolver.js';

const documentType = createNormalizedDocumentSemanticType(new NormalizedDocumentValidator());

function source(path: string, size = 100): ImportSourceFile {
	return { sourcePath: `/input/${path}`, relativePath: path, size };
}

function content(value: string): ImportContentReader {
	const bytes = new TextEncoder().encode(value);
	return {
		readPrefix: vi.fn(async maxBytes => bytes.subarray(0, maxBytes)),
		readAll: vi.fn(async () => bytes)
	};
}

function resolver(
	definitions: readonly SemanticTypeDefinition[] = [documentType],
	recognizers: readonly FilesystemImportRecognizer[] = [new NormalizedDocumentRecognizer()]
): FilesystemSemanticImportResolver {
	return new FilesystemSemanticImportResolver(
		new FilesystemImportClassifier(recognizers),
		new SemanticTypeRegistry(definitions)
	);
}

function recognizer(name: string, dataType: string): FilesystemImportRecognizer {
	return { name, recognize: () => dataType };
}

function semanticType(dataType: string, version: number, validate: (value: unknown) => void): SemanticTypeDefinition {
	return {
		dataType,
		dataVersion: version,
		resourceType: 'test/resource',
		objectType: 'test/object',
		validate
	};
}

describe('FilesystemSemanticImportResolver — Normalized Document', () => {
	it('does not read complete data for an unrecognized file', async () => {
		const reader = content('{"blocks":[]}');
		expect(await resolver().resolve(source('image.jpg'), reader)).toEqual({ kind: 'unrecognized' });
		expect(reader.readPrefix).not.toHaveBeenCalled();
		expect(reader.readAll).not.toHaveBeenCalled();
	});

	it('recognizes .nd.json and validates its entire document through the existing validator', async () => {
		const reader = content('{"blocks":[]}');
		const result = await resolver().resolve(source('books/pilgrim.nd.json'), reader);
		expect(result).toEqual({ kind: 'semantic', definition: documentType });
		expect(reader.readPrefix).not.toHaveBeenCalled();
		expect(reader.readAll).toHaveBeenCalledOnce();
	});

	it('scans a short prefix but reads a large ordinary JSON file only once for semantic validation', async () => {
		const bytes = '{"blocks":[]}' + ' '.repeat(70_000);
		const reader = content(bytes);
		const result = await resolver().resolve(source('large.json', Buffer.byteLength(bytes)), reader);
		expect(result.kind).toBe('semantic');
		expect(reader.readPrefix).toHaveBeenCalledWith(64 * 1024);
		expect(reader.readAll).toHaveBeenCalledOnce();
	});

	it('chooses newest when v2 and v1 both validate the same JSON', async () => {
		const v1 = vi.fn(documentType.validate);
		const v2 = vi.fn(documentType.validate);
		const result = await resolver([
		{ ...documentType, dataVersion: 1, validate: v1 },
		{ ...documentType, dataVersion: 2, validate: v2 }
		]).resolve(source('both.nd.json'), content('{"blocks":[]}'));
		expect(result.kind).toBe('semantic');
		if (result.kind !== 'semantic') throw new Error('Expected semantic result');
		expect(result.definition.dataVersion).toBe(2);
		expect(v2).toHaveBeenCalledOnce();
		expect(v1).not.toHaveBeenCalled();
	});

	it('falls back to v1 when v2 rejects the same valid document', async () => {
		const result = await resolver([
		{ ...documentType, dataVersion: 2, validate: () => { throw new Error('requires newer schema'); } },
		documentType
		]).resolve(source('old.nd.json'), content('{"blocks":[]}'));
		expect(result.kind).toBe('semantic');
		if (result.kind !== 'semantic') throw new Error('Expected semantic result');
		expect(result.definition.dataVersion).toBe(1);
	});

	it('tries every distinct family before choosing one that validates', async () => {
		const accepted = vi.fn(documentType.validate);
		const result = await resolver([
		semanticType('kjvonly.other', 1, () => { throw new Error('not this type'); }),
		{ ...documentType, validate: accepted }
		], [
			recognizer('other', 'kjvonly.other'),
			recognizer('document', documentType.dataType),
			recognizer('duplicate', documentType.dataType)
		]).resolve(source('ambiguous.json'), content('{"blocks":[]}'));
		expect(result.kind).toBe('semantic');
		expect(accepted).toHaveBeenCalledOnce();
	});

	it('rejects ambiguity only when different families both validate', async () => {
		const reader = content('{"blocks":[]}');
		await expect(resolver([
			semanticType('kjvonly.other', 1, () => {}),
			documentType
		], [
			recognizer('other', 'kjvonly.other'),
			recognizer('document', documentType.dataType)
		]).resolve(source('books/shared.json'), reader))
			.rejects.toThrow('Ambiguous validated semantic types for "books/shared.json": kjvonly.normalized-document v1; kjvonly.other v1');
		expect(reader.readAll).toHaveBeenCalledOnce();
	});

	it('returns unvalidated for JSON that matches a hint but violates the semantic contract', async () => {
		const result = await resolver().resolve(source('invalid.nd.json'), content('{"blocks":123}'));
		expect(result.kind).toBe('unvalidated');
		if (result.kind !== 'unvalidated') throw new Error('Expected unvalidated result');
		expect(result.failures.map(failure => failure.dataType)).toEqual(['kjvonly.normalized-document']);
		expect(result.failures[0]?.cause).toBeInstanceOf(AggregateError);
	});

	it('retains JSON decoding failures as unvalidated instead of committing a false-positive hint', async () => {
		const result = await resolver().resolve(source('books/bad.nd.json'), content('{"blocks": [broken'));
		expect(result.kind).toBe('unvalidated');
		if (result.kind !== 'unvalidated') throw new Error('Expected unvalidated result');
		expect(result.failures[0]?.dataType).toBe('kjvonly.normalized-document');
		expect(result.failures[0]?.cause).toBeInstanceOf(SyntaxError);
	});

	it('retains invalid UTF-8 decoding failures as unvalidated', async () => {
		const reader: ImportContentReader = {
			readPrefix: async () => new Uint8Array(),
			readAll: vi.fn(async () => Uint8Array.of(0xff))
		};
		const result = await resolver().resolve(source('bad.nd.json'), reader);
		expect(result.kind).toBe('unvalidated');
		if (result.kind !== 'unvalidated') throw new Error('Expected unvalidated result');
		expect(result.failures[0]?.cause).toBeInstanceOf(TypeError);
	});

	it('reports source reading errors with relative-path diagnostics', async () => {
		const cause = new Error('disk error');
		const reader: ImportContentReader = {
			readPrefix: async () => new Uint8Array(),
			readAll: async () => { throw cause; }
		};
		await expect(resolver().resolve(source('missing.nd.json'), reader))
			.rejects.toThrow('Cannot read import "missing.nd.json".');
	});

	it('rejects recognizer claims without a matching registry definition before reading all bytes', async () => {
		const reader = content('{"blocks":[]}');
		await expect(resolver([], [recognizer('missing', 'kjvonly.missing')]).resolve(source('file.json'), reader))
			.rejects.toThrow('Unsupported semantic data type kjvonly.missing for "file.json".');
		expect(reader.readAll).not.toHaveBeenCalled();
	});
});

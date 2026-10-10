import { describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';
import { FilesystemImportClassifier } from '../classification/filesystem-import-classifier.js';
import { NormalizedDocumentRecognizer } from '../classification/recognizers/normalized-document-recognizer.js';
import { FilesystemSemanticImportResolver } from '../resolution/filesystem-semantic-import-resolver.js';
import { SemanticTypeRegistry } from '../../semantic/semantic-type-registry.js';
import { validateManifest } from '#domain/manifest/manifest.js';
import { NormalizedDocumentManifestCompiler } from './normalized-document-manifest-compiler.js';
import { BuildNormalizedDocumentImport } from './build-normalized-document-import.js';

const directory = '/input';
const manifest = validateManifest({
	version: 1, kind: 37770, staging: { path: '.staging' },
	nostr: { relays: ['wss://relay.example'] }
});
const definition = {
	dataType: 'kjvonly.normalized-document', dataVersion: 1,
	resourceType: 'normalized-content/document', objectType: 'normalized-content/document',
	validate: (value: unknown) => {
		if (!value || typeof value !== 'object' || !('blocks' in value) ||
			!Array.isArray(value.blocks)) throw new Error('Bad Normalized Document');
	}
};

function setup(contents: Record<string, string>) {
	const build = vi.fn(async () => {});
	const reader = vi.fn((path: string) => {
		const json = contents[path];
		if (json === undefined) throw new Error(`Unexpected file: ${path}`);
		const bytes = new TextEncoder().encode(json);
		return {
			readPrefix: vi.fn(async (max: number) => bytes.subarray(0, max)),
			readAll: vi.fn(async () => bytes)
		};
	});
	return {
		build,
		useCase: new BuildNormalizedDocumentImport(
			new FilesystemSemanticImportResolver(
				new FilesystemImportClassifier([new NormalizedDocumentRecognizer()]),
				new SemanticTypeRegistry([definition])
			),
			reader,
			new NormalizedDocumentManifestCompiler(),
			{ build }
		)
	};
}

function file(path: string) {
	return { sourcePath: resolve(directory, path), relativePath: path, size: 13 };
}

describe('BuildNormalizedDocumentImport', () => {
	it('recognizes, validates, compiles and executes multiple files exactly once', async () => {
		const a = file('books/a.nd.json');
		const b = file('sermons/b.nd.json');
		const { useCase, build } = setup({
			[a.sourcePath]: '{"blocks":[]}',
			[b.sourcePath]: '{"blocks":[]}'
		});
		const result = await useCase.build({
			directory, filesystemRoot: 'library', manifest, files: [b, a]
		});
		expect(build).toHaveBeenCalledOnce();
		expect(build).toHaveBeenCalledWith({
			directory, origin: 'normalized-document-import', manifest: result
		});
		expect(Object.keys(result.resources)).toHaveLength(2);
		expect(Object.values(result.filesystems)[0]?.directories).toHaveLength(2);
	});

	it('rejects invalid and unrecognized inputs before any staging', async () => {
		const valid = file('valid.nd.json');
		const bad = file('bad.nd.json');
		const { useCase, build } = setup({
			[valid.sourcePath]: '{"blocks":[]}',
			[bad.sourcePath]: '{"blocks":false}'
		});
		await expect(useCase.build({
			directory, filesystemRoot: 'library', manifest, files: [valid, bad]
		})).rejects.toThrow('not a validated Normalized Document (unvalidated)');
		expect(build).not.toHaveBeenCalled();

		const { useCase: other, build: otherBuild } = setup({
			'/input/other.jpg': '{}'
		});
		await expect(other.build({
			directory, filesystemRoot: 'library', manifest,
			files: [file('other.jpg')]
		})).rejects.toThrow('not a validated Normalized Document (unrecognized)');
		expect(otherBuild).not.toHaveBeenCalled();
	});

	it('reports underlying schema rejection and retains its cause', async () => {
		const bad = file('books/invalid.nd.json');
		const { useCase, build } = setup({ [bad.sourcePath]: '{"blocks":false}' });
		let rejection: unknown;
		try {
			await useCase.build({ directory, filesystemRoot: 'library', manifest, files: [bad] });
		} catch (error) {
			rejection = error;
		}
		expect(rejection).toBeInstanceOf(Error);
		expect((rejection as Error).message).toContain('books/invalid.nd.json');
		expect((rejection as Error).message).toContain('Bad Normalized Document');
		expect((rejection as Error).cause).toBeInstanceOf(AggregateError);
		expect(build).not.toHaveBeenCalled();
	});

	it('reports JSON decoding diagnostics instead of only unvalidated', async () => {
		const bad = file('books/malformed.nd.json');
		const { useCase, build } = setup({ [bad.sourcePath]: '{"blocks": [broken' });
		await expect(useCase.build({
			directory, filesystemRoot: 'library', manifest, files: [bad]
		})).rejects.toThrow(/books\/malformed\.nd\.json.*kjvonly\.normalized-document: /);
		expect(build).not.toHaveBeenCalled();
	});
});

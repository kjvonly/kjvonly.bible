import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateManifest } from '#domain/manifest/manifest.js';
import { NodeImportDirectoryWalker } from '#adapters/import/node-import-directory-walker.js';
import { NodeImportContentReader } from '#adapters/import/node-import-content-reader.js';
import { FilesystemImportClassifier } from '../classification/filesystem-import-classifier.js';
import { NormalizedDocumentRecognizer } from '../classification/recognizers/normalized-document-recognizer.js';
import { FilesystemSemanticImportResolver } from '../resolution/filesystem-semantic-import-resolver.js';
import { SemanticTypeRegistry } from '../../semantic/semantic-type-registry.js';
import { NormalizedDocumentManifestCompiler } from '../manifest/normalized-document-manifest-compiler.js';
import { BuildNormalizedDocumentImport } from '../manifest/build-normalized-document-import.js';
import { BuildNormalizedDocumentDirectory } from './build-normalized-document-directory.js';

const temporaryDirectories: string[] = [];
afterEach(async () => {
	for (const directory of temporaryDirectories.splice(0)) {
		await rm(directory, { recursive: true, force: true });
	}
});

describe('Normalized Document recursive directory import', () => {
	it('reads real nested files and passes one mirrored Manifest to the existing executor', async () => {
		const workspace = await mkdtemp(join(tmpdir(), 'kjvonly-normalized-import-'));
		temporaryDirectories.push(workspace);
		const source = join(workspace, 'content');
		const config = join(workspace, 'config');
		await mkdir(join(source, 'books'), { recursive: true });
		await mkdir(config);
		await writeFile(join(source, 'books', 'a.nd.json'), '{"blocks":[]}');
		await writeFile(join(source, 'z.nd.json'), '{"blocks":[]}');
		await writeFile(join(source, 'ignore.json'), '{"blocks":false}');

		const manifest = validateManifest({
			version: 1, kind: 37770, staging: { path: '.staging' },
			nostr: { relays: ['wss://relay.example'] }
		});
		const loader = { load: vi.fn(async () => ({
			path: join(config, 'publication.yaml'), directory: config, manifest
		})) };
		const build = vi.fn(async () => {});
		const importer = new BuildNormalizedDocumentImport(
			new FilesystemSemanticImportResolver(
				new FilesystemImportClassifier([new NormalizedDocumentRecognizer()]),
				new SemanticTypeRegistry([{
					dataType: 'kjvonly.normalized-document', dataVersion: 1,
					resourceType: 'normalized-content/document',
					objectType: 'normalized-content/document',
					validate: value => {
						if (!value || typeof value !== 'object' || !('blocks' in value) ||
							!Array.isArray(value.blocks)) throw new Error('Invalid document');
					}
				}])
			),
			path => new NodeImportContentReader(path),
			new NormalizedDocumentManifestCompiler(),
			{ build }
		);
		const write = vi.fn(async () => {});
		const workflow = new BuildNormalizedDocumentDirectory(
			new NodeImportDirectoryWalker(), loader, importer, { write },
			{ prepare: async () => ({ stagingRoot: join(config, '.staging.import-test'), discard: async () => {} }) }
		);
		const result = await workflow.build({
			directory: source, manifestPath: './publication.yaml', outputManifestPath: join(config, 'compiled.json'), filesystemRoot: 'library'
		});

		expect(build).toHaveBeenCalledOnce();
		expect(build).toHaveBeenCalledWith({
			directory: source, manifest: result, origin: 'normalized-document-import'
		});
		expect(result.staging.path).toBe(join(config, '.staging.import-test'));
		expect(write).toHaveBeenCalledWith(join(config, 'compiled.json'), result);
		expect(Object.values(result.resources).map(resource =>
			Object.fromEntries(resource.event.tags).d
		)).toEqual([
			'kjvonly/normalized-content/documents/library/books/a.nd.json',
			'kjvonly/normalized-content/documents/library/z.nd.json'
		]);
		const filesystem = Object.values(result.filesystems)[0]!;
		expect(filesystem.root).toBe('library');
		expect(filesystem.directories.map(directory => directory.path)).toEqual(['books', '']);
	});
});

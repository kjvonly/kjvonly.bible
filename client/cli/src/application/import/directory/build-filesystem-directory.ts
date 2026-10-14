import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { Manifest } from '#domain/manifest/manifest.js';
import type { ManifestLoader } from '#ports/manifest/manifest-loader.js';
import type { ImportDirectoryWalker } from './import-directory-walker.js';
import type { GeneratedManifestWriter } from './generated-manifest-writer.js';
import type { ImportStagingWorkspace } from './import-staging-workspace.js';
import type { BuildFilesystemImport } from '../manifest/build-filesystem-import.js';

/** Options for the recursive filesystem import. */
export interface BuildFilesystemDirectoryRequest {
	readonly directory: string;
	readonly manifestPath: string;
	readonly outputManifestPath: string;
	readonly filesystemRoot: string;
	readonly inlineLimitBytes?: number;
}

/** Walks a directory, compiles every file through the registered strategies, and atomically selects staging. */
export class BuildFilesystemDirectory {
	constructor(
		private readonly walker: ImportDirectoryWalker,
		private readonly loader: ManifestLoader,
		private readonly importer: Pick<BuildFilesystemImport, 'build'>,
		private readonly writer: GeneratedManifestWriter,
		private readonly stagingWorkspace: ImportStagingWorkspace
	) {}

	/** Failed validation/staging never replaces the last publishable Manifest. */
	async build(request: BuildFilesystemDirectoryRequest): Promise<Manifest> {
		const directory = resolve(request.directory);
		const outputManifestPath = resolve(request.outputManifestPath);
		const outputRelativePath = relative(directory, outputManifestPath);
		if (outputRelativePath === '' ||
			(!outputRelativePath.startsWith(`..${sep}`) &&
				outputRelativePath !== '..' &&
				!isAbsolute(outputRelativePath))) {
			throw new Error('Generated Manifest output must be outside the imported directory.');
		}
		if (outputManifestPath.toLowerCase().endsWith('.nd.json')) {
			throw new Error('Generated Manifest output must not have a .nd.json filename.');
		}
		const files = await this.walker.walk(directory);
		if (files.length === 0) throw new Error(`No files found under "${directory}".`);

		const loaded = await this.loader.load(request.manifestPath);
		if (outputManifestPath === resolve(loaded.path)) {
			throw new Error('Generated Manifest output must not overwrite the source publication manifest.');
		}
		// Existing YAML paths are relative to the YAML directory, not the walked root.
		if (Object.keys(loaded.manifest.resources).length > 0 ||
			Object.keys(loaded.manifest.collections).length > 0 ||
			Object.keys(loaded.manifest.filesystems).length > 0) {
			throw new Error('Directory import requires a configuration-only Manifest (no Resources, Collections, or Filesystems).');
		}
		const baselineRoot = resolve(loaded.directory, loaded.manifest.staging.path);
		const generation = await this.stagingWorkspace.prepare(baselineRoot, outputManifestPath);
		try {
			const manifest: Manifest = { ...loaded.manifest, staging: { path: generation.stagingRoot } };
			const compiled = await this.importer.build({
				directory, manifest, filesystemRoot: request.filesystemRoot,
				files, inlineLimitBytes: request.inlineLimitBytes
			});
			await this.writer.write(outputManifestPath, compiled);
			return compiled;
		} catch (error) {
			await generation.discard();
			throw error;
		}
	}
}

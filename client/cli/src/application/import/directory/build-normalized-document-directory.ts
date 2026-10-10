import { resolve } from 'node:path';
import type { Manifest } from '#domain/manifest/manifest.js';
import type { ManifestLoader } from '#ports/manifest/manifest-loader.js';
import type { ImportDirectoryWalker } from './import-directory-walker.js';
import type { GeneratedManifestWriter } from './generated-manifest-writer.js';
import type { ImportStagingWorkspace } from './import-staging-workspace.js';
import type { BuildNormalizedDocumentImport } from '../manifest/build-normalized-document-import.js';

/** CLI-facing request for staging all `.nd.json` documents in a source tree. */
export interface BuildNormalizedDocumentDirectoryRequest {
	/** Local directory walked recursively; it need not be near the YAML file. */
	readonly directory: string;
	/** Configuration-only input YAML Manifest; never overwritten. */
	readonly manifestPath: string;
	/** Generated JSON Manifest selecting the newly staged generation. */
	readonly outputManifestPath: string;
	/** Canonical mount name mirrored in Filesystem paths and Resource identities. */
	readonly filesystemRoot: string;
	/** Original-file byte limit for inline Resources; default is 1 MiB. */
	readonly inlineLimitBytes?: number;
}

/**
 * Directory-based frontend for the existing Normalized Document Manifest flow.
 * The first supported extension is `.nd.json`; unrelated files are ignored.
 * Every selected document is validated before any staging occurs. A new
 * staging generation is prepared from the previous one for incremental reuse;
 * only a successful build replaces the generated Manifest pointer. This does
 * not publish events or artifacts to remote services.
 */
export class BuildNormalizedDocumentDirectory {
	constructor(
		private readonly walker: ImportDirectoryWalker,
		private readonly loader: ManifestLoader,
		private readonly importer: Pick<BuildNormalizedDocumentImport, 'build'>,
		private readonly writer: GeneratedManifestWriter,
		private readonly stagingWorkspace: ImportStagingWorkspace
	) {}

	/**
	 * @param request Source directory, publication Manifest, and Filesystem mount.
	 * @returns Generated Manifest selecting the successfully built generation.
	 * @throws For invalid input/configuration, empty discovery, failed semantic
	 * validation, build/staging failure, or inability to write the pointer.
	 * A failed import retains the previous generated Manifest and staging tree.
	 */
	async build(request: BuildNormalizedDocumentDirectoryRequest): Promise<Manifest> {
		const directory = resolve(request.directory);
		const outputManifestPath = resolve(request.outputManifestPath);
		if (outputManifestPath.toLowerCase().endsWith('.nd.json')) {
			throw new Error('Generated Manifest output must not have a .nd.json filename.');
		}
		const files = (await this.walker.walk(directory)).filter(file =>
			file.relativePath.toLowerCase().endsWith('.nd.json')
		);
		if (files.length === 0) {
			throw new Error(`No .nd.json files found under "${directory}".`);
		}

		const loaded = await this.loader.load(request.manifestPath);
		if (outputManifestPath === resolve(loaded.path)) {
			throw new Error('Generated Manifest output must not overwrite the source publication manifest.');
		}
		// Existing YAML Resource paths resolve against the YAML directory, not
		// the imported tree. Until both bases can be combined explicitly, accept
		// configuration-only manifests to avoid silently reading the wrong files.
		if (Object.keys(loaded.manifest.resources).length > 0 ||
			Object.keys(loaded.manifest.collections).length > 0 ||
			Object.keys(loaded.manifest.filesystems).length > 0) {
			throw new Error('Normalized Document directory import requires a configuration-only Manifest (no Resources, Collections, or Filesystems).');
		}
		// Source paths remain relative to the import directory, but staging must
		// resolve from the YAML directory so the existing `publish <manifest>`
		// command reads exactly the events produced by this build.
		const baselineRoot = resolve(loaded.directory, loaded.manifest.staging.path);
		const generation = await this.stagingWorkspace.prepare(baselineRoot, outputManifestPath);
		try {
			const manifest: Manifest = {
				...loaded.manifest,
				staging: { path: generation.stagingRoot }
			};
			const compiled = await this.importer.build({
				directory,
				manifest,
				filesystemRoot: request.filesystemRoot,
				files,
				inlineLimitBytes: request.inlineLimitBytes
			});
			// Atomically switch the publication Manifest only after all staging succeeds.
			// The old Manifest and its staging generation remain usable on failure.
			await this.writer.write(outputManifestPath, compiled);
			return compiled;
		} catch (error) {
			await generation.discard();
			throw error;
		}
	}
}

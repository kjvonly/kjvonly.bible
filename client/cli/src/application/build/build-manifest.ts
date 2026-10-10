import type { Logger } from '#ports/logging/logger.js';
import type { ManifestLoader } from '#ports/manifest/manifest-loader.js';
import type { Manifest } from '#domain/manifest/manifest.js';
import type { ManifestBuildExecutor } from './manifest-build-executor.js';

export interface BuildManifest {
	build(manifestPath: string): Promise<void>;
}

/**
 * YAML entrypoint. Loads one Manifest, then delegates all build execution to
 * the shared executor used by other Manifest-producing frontends.
 */
export class BuildManifestUseCase implements BuildManifest {
	constructor(
		private readonly manifestLoader: ManifestLoader,
		private readonly executor: Pick<ManifestBuildExecutor, 'build'>,
		private readonly logger: Logger
	) {}

	async build(manifestPath: string): Promise<void> {
		this.logger.verbose('build.start', { manifestPath });

		const loaded = await this.manifestLoader.load(manifestPath);

		this.logManifestLoaded(manifestPath, loaded.manifest);

		await this.executor.build({
			directory: loaded.directory,
			manifest: loaded.manifest,
			origin: manifestPath
		});

		this.logger.verbose('build.complete', { manifestPath });
	}

	private logManifestLoaded(
		manifestPath: string,
		manifest: Manifest
	): void {
		this.logger.verbose('build.manifest.loaded', {
			manifestPath,
			resourceCount: Object.keys(manifest.resources).length,
			collectionCount: Object.keys(manifest.collections).length,
			filesystemCount: Object.keys(manifest.filesystems).length
		});
	}
}

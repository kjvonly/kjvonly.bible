import type { Manifest } from '#domain/manifest/manifest.js';
import type { ManifestBuildExecutor } from '#application/build/manifest-build-executor.js';
import type { FilesystemImportBuildRequest } from './filesystem-import-build-request.js';
import { FilesystemImportManifestCompiler } from './filesystem-import-manifest-compiler.js';

/** Validates/compiles every discovered file before executing the common builder. */
export class BuildFilesystemImport {
	constructor(
		private readonly compiler: FilesystemImportManifestCompiler,
		private readonly executor: Pick<ManifestBuildExecutor, 'build'>
	) {}

	async build(request: FilesystemImportBuildRequest): Promise<Manifest> {
		// Strict `.nd.json` strategies may throw; no Resource staging begins in that case.
		const manifest = await this.compiler.compile(request);
		await this.executor.build({
			directory: request.directory, manifest, origin: 'filesystem-import'
		});
		return manifest;
	}
}

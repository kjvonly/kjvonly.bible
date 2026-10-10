import { cp, lstat, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { validateManifest } from '#domain/manifest/manifest.js';
import type {
	ImportStagingGeneration,
	ImportStagingWorkspace
} from '#application/import/directory/import-staging-workspace.js';

/**
 * Keeps in-progress imports separate from the staging tree selected by the
 * last successfully generated Manifest. Copies the previous staged events and
 * artifact metadata (including symlinks) for fast reuse; a failed build discards
 * only its new generation without changing the prior Manifest pointer.
 *
 * This is local staging isolation, not remote publication, immutable artifact
 * snapshots, or a multi-process lock. Older successful generations remain until
 * explicitly cleaned up.
 */
export class NodeImportStagingWorkspace implements ImportStagingWorkspace {
	async prepare(baselineRoot: string, outputManifestPath: string): Promise<ImportStagingGeneration> {
		const baseline = resolve(baselineRoot);
		const output = resolve(outputManifestPath);
		const previous = await this.previousStagingRoot(baseline, output);
		await mkdir(dirname(baseline), { recursive: true });
		const stagingRoot = await mkdtemp(`${baseline}.import-`);
		try {
			if (previous !== undefined && await this.isDirectory(previous)) {
				// Preserve staging symlinks as links, never dereference source-backed objects.
				await cp(previous, stagingRoot, { recursive: true, verbatimSymlinks: true });
			}
		} catch (error) {
			await rm(stagingRoot, { recursive: true, force: true });
			throw error;
		}
		return {
			stagingRoot,
			discard: async () => {
				await rm(stagingRoot, { recursive: true, force: true });
			}
		};
	}

	/** Selects only a baseline or a generation owned by this import's staging root. */
	private async previousStagingRoot(baseline: string, output: string): Promise<string | undefined> {
		let json: string;
		try {
			json = await readFile(output, 'utf8');
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return baseline;
			throw error;
		}
		const manifest = validateManifest(JSON.parse(json));
		const stagingRoot = resolve(dirname(output), manifest.staging.path);
		if (stagingRoot !== baseline && !(
			dirname(stagingRoot) === dirname(baseline) &&
			basename(stagingRoot).startsWith(`${basename(baseline)}.import-`)
		)) {
			throw new Error(`Existing generated Manifest uses an unexpected staging root: ${stagingRoot}`);
		}
		if (!await this.isDirectory(stagingRoot)) {
			throw new Error(`Previously published staging root is unavailable: ${stagingRoot}`);
		}
		return stagingRoot;
	}

	private async isDirectory(path: string): Promise<boolean> {
		try {
			// Reject symlinks for the root; staged artifact symlinks inside it are valid.
			return (await lstat(path)).isDirectory();
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
			throw error;
		}
	}
}

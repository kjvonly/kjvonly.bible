import { createHash } from 'node:crypto';
import type { FilesystemDefinition, FilesystemDirectoryDefinition } from '#domain/manifest/manifest.js';

/** Stable, staging-only name; the published `d` identity is independent. */
export function filesystemImportManifestName(filesystemRoot: string): string {
	return `normalized-filesystem-${createHash('sha256').update(filesystemRoot).digest('hex')}`;
}

/** Shared Filesystem Resource envelope for any registered file compiler. */
export function filesystemImportManifestDefinition(
	filesystemRoot: string,
	directories: readonly FilesystemDirectoryDefinition[]
): FilesystemDefinition {
	return {
		root: filesystemRoot,
		event: {
			encoding: ['gzip', 'hex'],
			tags: [
				['d', `kjvonly/filesystem/${filesystemRoot}`],
				['m', 'application/json+gzip+hex'],
				['t', 'filesystem/entry'],
				['dataType', 'kjvonly.filesystem.entries'],
				['dataVersion', '1'],
				['representation', 'content']
			]
		},
		directories: [...directories]
	};
}

import type {
	ResourceInstallationStore
} from '$lib/resource';

import type {
	FilesystemStore
} from '../persistence/filesystem-store';

/** Stores that participate atomically in inbound filesystem Resource installs. */
export interface FilesystemInstallationStores {
	readonly filesystem:
		Pick<
			FilesystemStore,
			'put'
		>;

	readonly resourceInstallations:
		ResourceInstallationStore;
}

/** Transaction boundary for filesystem mappings and Resource provenance. */
export interface FilesystemInstallationTransaction {
	run<TResult>(
		operation:
			(
				stores:
					FilesystemInstallationStores
			) => Promise<TResult>
	): Promise<TResult>;
}

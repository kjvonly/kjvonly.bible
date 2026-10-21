import type {
	ResourceDescriptor
} from '$lib/resource';

import type {
	FilesystemEntry
} from '../models/filesystem-entry';

import type {
	FilesystemRoot
} from '../models/filesystem-root';

import type {
	FilesystemSearchMatch
} from '../models/filesystem-search-match';

import type {
	FilesystemSearchByIndex
} from '../models/filesystem-search-index';

import type {
	FilesystemStore
} from '../persistence/filesystem-store';

interface FilesystemSearchPort {
	search(
		byIndex:
			FilesystemSearchByIndex,
		text: string
	): Promise<
		readonly FilesystemSearchMatch[]
	>;
}

/**
 * Application-facing read boundary for accepted mounted Filesystem mappings.
 *
 * This service reads mappings already accepted by the Filesystem lifecycle.
 * Resolving or installing an entry's target Resource remains the Resource
 * layer's responsibility.
 */
export class FilesystemService {

	constructor(
		private readonly store:
			Pick<
				FilesystemStore,
				'get' |
					'listRoots' |
					'listByRootPath'
			>,

		private readonly searchRuntime:
			FilesystemSearchPort
	) {}

	/** Returns the accepted filesystem roots currently mounted in the application. */
	listRoots(): Promise<
		readonly FilesystemRoot[]
	> {
		return this.store.listRoots();
	}

	/** Returns one mounted entry by its filesystem identity. */
	get(
		publisher: string,
		rootPath: string,
		path: string
	): Promise<
		FilesystemEntry |
		undefined
	> {
		return this.store.get(
			publisher,
			rootPath,
			path
		);
	}

	/** Lists mounted entries under one source publisher and filesystem root. */
	listByRootPath(
		publisher: string,
		rootPath: string
	): Promise<
		readonly FilesystemEntry[]
	> {
		return this.store.listByRootPath(
			publisher,
			rootPath
		);
	}

	/**
	 * Locate an accepted mounted mapping for an opaque Resource identity.
	 *
	 * Keep the FilesystemEntry so callers can use its path as display-only
	 * launch context. Identity is matched exclusively by Resource publisher and
	 * Resource ID; equal identities select the newest advertised descriptor.
	 */
	async findResourceEntry(
		publisher: string,
		resourceId: string
	): Promise<FilesystemEntry | undefined> {
		let newest: FilesystemEntry | undefined;
		for (const root of await this.listRoots()) {
			const entries = await this.listByRootPath(root.publisher, root.rootPath);
			for (const entry of entries) {
				const { descriptor } = entry;
				if (descriptor.metadata.publisher !== publisher ||
					descriptor.metadata.resourceId !== resourceId) continue;
				if (!newest || descriptor.metadata.modifiedAt > newest.descriptor.metadata.modifiedAt) {
					newest = entry;
				}
			}
		}
		return newest;
	}

	/** Return the newest mounted Resource descriptor without Filesystem presentation context. */
	async findResourceDescriptor(
		publisher: string,
		resourceId: string
	): Promise<ResourceDescriptor | undefined> {
		return (await this.findResourceEntry(publisher, resourceId))?.descriptor;
	}

	/**
	 * Searches accepted mounted mappings by indexed descriptor metadata, matching
	 * display name or filesystem path without resolving target Resources.
	 */
	search(
		byIndex:
			FilesystemSearchByIndex,
		text: string
	): Promise<
		readonly FilesystemSearchMatch[]
	> {
		return this.searchRuntime.search(
			byIndex,
			text
		);
	}
}

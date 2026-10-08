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

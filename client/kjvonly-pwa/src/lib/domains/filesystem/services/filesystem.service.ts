import type {
	FilesystemEntry
} from '../models/filesystem-entry';

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
 * Application-facing read boundary for mounted filesystem Resources.
 *
 * This service only discovers Resource mappings that are already mounted.
 * Resolving or installing an entry's target Resource remains the Resource
 * layer's responsibility.
 */
export class FilesystemService {

	constructor(
		private readonly store:
			Pick<
				FilesystemStore,
				'get' |
					'listByRootPath'
			>,

		private readonly searchRuntime:
			FilesystemSearchPort
	) {}

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
	 * Searches mounted Resources selected by an indexed descriptor metadata
	 * field, matching display name or filesystem path without resolving targets.
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

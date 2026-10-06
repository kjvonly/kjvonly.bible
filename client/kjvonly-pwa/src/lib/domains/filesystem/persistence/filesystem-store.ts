import type {
	FilesystemEntry
} from '../models/filesystem-entry';

import type {
	FilesystemRoot
} from '../models/filesystem-root';

/**
 * Persistence boundary for discoverable filesystem mappings.
 *
 * Publisher, rootPath, and path are separate structural identity components.
 * The target descriptor may reference a Resource owned by a different
 * publisher and therefore does not participate in filesystem entry identity.
 */
export interface FilesystemStore {
	/** Returns the distinct mounted filesystem roots currently persisted. */
	listRoots(): Promise<
		readonly FilesystemRoot[]
	>;

	/** Returns one mapping by source publisher, root, and relative path. */
	get(
		publisher: string,
		rootPath: string,
		path: string
	): Promise<
		FilesystemEntry |
		undefined
	>;

	/** Returns mappings grouped under one filesystem root. */
	listByRootPath(
		publisher: string,
		rootPath: string
	): Promise<
		readonly FilesystemEntry[]
	>;

	/** Persists one root-relative mapping under the supplied filesystem root. */
	put(
		publisher: string,
		rootPath: string,
		entry: FilesystemEntry
	): Promise<void>;

	/** Removes one mapping by source publisher, root, and relative path. */
	delete(
		publisher: string,
		rootPath: string,
		path: string
	): Promise<void>;
}

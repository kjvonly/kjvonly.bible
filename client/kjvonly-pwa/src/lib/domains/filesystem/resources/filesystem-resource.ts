import {
	FILESYSTEM_ENTRY_OBJECT_TYPE
} from '../models/filesystem-entry-id';

/** Application type for Resources that install Filesystem entries. */
export const FILESYSTEM_RESOURCE_TYPE =
	FILESYSTEM_ENTRY_OBJECT_TYPE;

/** Semantic payload contract keyed by complete Filesystem paths that include the root. */
export const FILESYSTEM_ENTRIES_DATA_TYPE =
	'kjvonly.filesystem.entries';

/** Current semantic version of the Filesystem entries payload contract. */
export const FILESYSTEM_ENTRIES_DATA_VERSION =
	1;

/** One path-keyed Filesystem Resource payload entry before descriptor validation. */
export interface FilesystemEntriesResourceEntry {
	/** Untrusted target Resource descriptor validated later by the Resource layer. */
	readonly descriptor: unknown;
}

/** Semantic payload carried by one Filesystem Resource. */
export type FilesystemEntriesResourceData =
	Readonly<
		Record<
			string,
			FilesystemEntriesResourceEntry
		>
	>;

import type {
	ResourceDescriptor
} from '../resource/resource-descriptor.js';


/** Resource Type used by published Filesystem overlay Resources. */
export const FILESYSTEM_RESOURCE_TYPE =
	'filesystem/entry';

/** Semantic datatype containing a path-keyed set of Filesystem entries. */
export const FILESYSTEM_ENTRIES_DATA_TYPE =
	'kjvonly.filesystem.entries';

/** Current semantic datatype version for Filesystem entry overlays. */
export const FILESYSTEM_ENTRIES_DATA_VERSION =
	1;

/** Resource metadata key carrying the Filesystem root/mount. */
export const FILESYSTEM_ROOT_METADATA_KEY =
	'f';


/** One path-keyed entry in published Filesystem Resource content. */
export interface FilesystemEntryContent {
	/** Target Resource descriptor preserved for later client-side resolution. */
	readonly descriptor:
		ResourceDescriptor;
}


/**
 * Semantic content carried by one Filesystem Resource.
 * Keys are canonical complete Filesystem paths that include the Resource root.
 */
export type FilesystemEntriesContent =
	Readonly<
		Record<
			string,
			FilesystemEntryContent
		>
	>;

import type {
	FilesystemEntry
} from '$lib/domains/filesystem';

/**
 * One mounted FilesystemEntry together with the root that exposed it.
 *
 * This is FileManager runtime/search context only. The FilesystemEntry remains
 * the persisted mapping and its ResourceDescriptor remains the Resource-open
 * boundary.
 */
export interface LocatedFilesystemEntry {
	/** Publisher of the filesystem root containing the entry. */
	readonly filesystemPublisher: string;

	/** Root path under which the entry is mounted. */
	readonly rootPath: string;

	/** Persisted filesystem mapping exposed by that root. */
	readonly entry: FilesystemEntry;
}

import type {
	ResourceDescriptor
} from '$lib/resource';

/**
 * A discoverable mapping from a filesystem path to a target Resource.
 * The stored path includes the filesystem root path used to mount the entry.
 *
 * The entry stores the target ResourceDescriptor unchanged. It describes
 * content that is available to the application; it is not itself the target
 * Domain Object and does not imply that the target Resource has been loaded.
 */
export interface FilesystemEntry {
	/** Filesystem path including the root path under which the entry is stored. */
	readonly path: string;

	/** Descriptor used later by the generic Resource loading and installation flow. */
	readonly descriptor: ResourceDescriptor;
}

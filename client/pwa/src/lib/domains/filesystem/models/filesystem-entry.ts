import type {
	ResourceDescriptor
} from '$lib/resource';

/**
 * First-class accepted Filesystem state mapping a path to a target Resource.
 * The stored path includes the filesystem root path used to mount the entry.
 *
 * The entry stores the target ResourceDescriptor unchanged. The mapping itself
 * is accepted Filesystem state; its target Resource may still be unresolved or
 * uninstalled, and the entry is not that target Resource's Domain Object.
 */
export interface FilesystemEntry {
	/** Filesystem path including the root path under which the entry is stored. */
	readonly path: string;

	/** Descriptor used later by the generic Resource loading and installation flow. */
	readonly descriptor: ResourceDescriptor;
}

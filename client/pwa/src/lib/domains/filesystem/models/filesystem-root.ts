/**
 * Identity of one mounted filesystem root.
 *
 * A root belongs to the filesystem source publisher. Target Resource
 * descriptors exposed beneath the root may belong to different publishers.
 */
export interface FilesystemRoot {
	/** Publisher/source that contributed this mounted Filesystem root. */
	readonly publisher: string;

	/** Canonical root/mount path contributed by the Filesystem Resource. */
	readonly rootPath: string;
}

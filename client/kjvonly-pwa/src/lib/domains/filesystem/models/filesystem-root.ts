/**
 * Identity of one mounted filesystem root.
 *
 * A root belongs to the filesystem source publisher. Target Resource
 * descriptors exposed beneath the root may belong to different publishers.
 */
export interface FilesystemRoot {
	readonly publisher: string;
	readonly rootPath: string;
}

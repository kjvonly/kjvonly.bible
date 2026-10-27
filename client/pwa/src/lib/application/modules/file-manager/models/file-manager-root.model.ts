import type {
	FilesystemRoot
} from '$lib/domains/filesystem';

/** Presentation-only mounted-root projection for the FileManager landing view. */
export interface FileManagerRootDisplay {
	readonly root: FilesystemRoot;
	/** Human-readable basename used as the primary row label. */
	readonly name: string;

	/** Full mounted root path retained as supporting context. */
	readonly path: string;
}

/** One FileManager landing group keyed by filesystem-mapping publisher. */
export interface FileManagerRootGroup {
	/** Filesystem-mapping publisher identity. */
	readonly filesystemPublisher: string;

	/** User-facing filesystem publisher label resolved outside FileManager persistence. */
	readonly filesystemPublisherName: string;
	readonly roots: readonly FileManagerRootDisplay[];
}

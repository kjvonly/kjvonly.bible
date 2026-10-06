import type {
	FilesystemEntry
} from '$lib/domains/filesystem';

/** One projected directory in the ephemeral FileManager tree. */
export interface FileManagerDirectory {
	readonly kind: 'directory';
	readonly name: string;
	/** Full filesystem path, including the mounted root prefix. */
	readonly path: string;
	readonly directories:
		readonly FileManagerDirectory[];
	readonly resources:
		readonly FileManagerResource[];
}

/** One Resource exposed as a file inside the projected FileManager tree. */
export interface FileManagerResource {
	readonly kind: 'resource';
	readonly name: string;
	/** Full filesystem path, including the mounted root prefix. */
	readonly path: string;
	/** Persisted mapping retained so Resource opening can forward its descriptor unchanged. */
	readonly entry: FilesystemEntry;
}


/** One ancestor/current-path segment rendered in the wide-pane breadcrumb. */
export interface FileManagerBreadcrumb {
	readonly name: string;
	readonly path: string;
}

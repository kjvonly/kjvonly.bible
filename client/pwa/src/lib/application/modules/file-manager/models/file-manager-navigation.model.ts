import type {
	FileManagerSearchFileType
} from './file-manager-search-file-type.model';

export const FILE_MANAGER_VIEWS = {
	ROOT: 'file-manager.root',
	BROWSER: 'file-manager.browser',
	SEARCH: 'file-manager.search',
	OVERFLOW_ACTIONS: 'file-manager.overflow-actions'
} as const;

export type FileManagerView =
	typeof FILE_MANAGER_VIEWS[
		keyof typeof FILE_MANAGER_VIEWS
	];

export const FILE_MANAGER_NAVIGATION_RESULTS = {
	OVERFLOW_ACTION: 'file-manager.overflow-action'
} as const;

export const FILE_MANAGER_OVERFLOW_ACTIONS = {
	SPLIT_HORIZONTAL: 'split-horizontal',
	SPLIT_VERTICAL: 'split-vertical'
} as const;

export type FileManagerOverflowAction =
	typeof FILE_MANAGER_OVERFLOW_ACTIONS[
		keyof typeof FILE_MANAGER_OVERFLOW_ACTIONS
	];


/** FileManager presentation mode persisted as semantic navigation state. */
export type FileManagerViewMode =
	| 'list'
	| 'grid';

/** Serializable semantic state for one mounted filesystem browser view. */
export interface FileManagerBrowserNavigationState {
	/**
	 * Persisted filesystem-mapping publisher key. The serialized field remains
	 * `publisher`; runtime code should prefer the explicit name
	 * `filesystemPublisher`.
	 */
	readonly publisher: string;

	/** Mounted root path; FilesystemEntry paths include this prefix. */
	readonly rootPath: string;

	/** Current full filesystem folder path, including rootPath. */
	readonly path: string;

	readonly viewMode: FileManagerViewMode;
}

/** Serializable semantic state for the global FileManager finder view. */
export interface FileManagerSearchNavigationState {
	readonly query: string;

	/**
	 * Persisted filesystem-mapping publisher filter. The serialized field remains
	 * `publisher`; runtime code should prefer the explicit name
	 * `filesystemPublisher`.
	 */
	readonly publisher: string;

	/** Exact mounted-root filter; empty means all roots. */
	readonly rootPath: string;

	/** Exact target Resource publisher filter; empty means all. */
	readonly resourcePublisher: string;
	/** Optional human-facing category from `resourceMetadata.category`; empty means all. */
	readonly category: string;
	readonly dataType: string;
	readonly mediaType: string;
	readonly fileType: FileManagerSearchFileType;
	readonly viewMode: FileManagerViewMode;
}

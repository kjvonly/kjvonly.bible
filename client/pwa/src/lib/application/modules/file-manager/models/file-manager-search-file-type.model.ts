/** User-facing generic type facet used only by FileManager metadata search/filtering. */
export type FileManagerSearchFileType =
	| 'all'
	| 'audio'
	| 'video'
	| 'image'
	| 'document';

/** Indexed value; `other` remains visible under All but has no dedicated filter. */
export type FileManagerIndexedFileType =
	Exclude<FileManagerSearchFileType, 'all'> | 'other';

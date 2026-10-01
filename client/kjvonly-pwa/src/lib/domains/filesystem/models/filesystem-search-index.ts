/** Indexed descriptor metadata fields supported by filesystem search. */
export type FilesystemSearchIndex =
	| 'category'
	| 'dataType';

/** Selects one indexed descriptor metadata field and the exact value to match. */
export interface FilesystemSearchByIndex {
	readonly index:
		FilesystemSearchIndex;

	readonly value: string;
}

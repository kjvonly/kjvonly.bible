export interface NoteTag {
	id: string;
	created: number;
	modified: number;
	tag: string;
}

/**
 * Application-facing Note Domain Object.
 *
 * A Note may be associated with a Bible location or may stand on its own.
 * Standalone Notes use `undefined`; they do not use a synthetic Bible
 * location sentinel.
 */
export interface Note {
	id: string;
	bibleLocationRef: string | undefined;
	bibleReferenceText: string | undefined;
	text: string;
	html: string;
	title: string;
	dateCreated: number;
	dateUpdated: number;
	tags: NoteTag[];
}

export type NotesById = Record<string, Note>;

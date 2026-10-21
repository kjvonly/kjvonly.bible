import type {
	NormalizedContentAddress
} from '$lib/domains/normalized-content';

export interface NoteTag {
	id: string;
	created: number;
	modified: number;
	tag: string;
}

/** Logical normalized-document Resource identity, independent of its content revisions. */
export interface NormalizedDocumentNoteIdentity {
	readonly publisher: string;
	readonly resourceId: string;
}

/** Canonical block/content index; the location may shift if its Resource changes. */
export type NormalizedDocumentNoteAddress = NormalizedContentAddress;

/** Notes target a Resource or one canonical word, without tracking Resource revisions. */
export interface NormalizedDocumentNoteAssociation {
	readonly kind: 'normalized-document';
	readonly document: NormalizedDocumentNoteIdentity;
	readonly target:
		| { readonly kind: 'document' }
		| {
			readonly kind: 'word';
			readonly address: NormalizedDocumentNoteAddress;
		};
}

/**
 * Application-facing Note Domain Object.
 *
 * A Note may be associated with a Bible location, a normalized document, or stand alone.
 * Standalone Notes use `undefined`; they do not use a synthetic Bible
 * location sentinel.
 */
export interface Note {
	id: string;
	bibleLocationRef: string | undefined;
	bibleReferenceText: string | undefined;
	/** Absent for standalone Notes and Bible-associated Notes. */
	association?: NormalizedDocumentNoteAssociation;
	text: string;
	html: string;
	title: string;
	dateCreated: number;
	dateUpdated: number;
	tags: NoteTag[];
}

export type NotesById = Record<string, Note>;

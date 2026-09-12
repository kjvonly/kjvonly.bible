import type {
	Note,
	NotesById
} from '$lib/domains/notes/models/note.model';

export const NOTES_COLLECTION_CHANGED =
	'notes:collection-changed' as const;

export type NotesSearchWorkerRequest =
	| {
		action: 'initialize';
		notes: Note[];
	}
	| {
		action: 'put';
		note: Note;
	}
	| {
		action: 'remove';
		noteId: string;
	}
	| {
		action: 'search';
		id: string;
		text: string;
		indexes: string[];
	}
	| {
		action: 'get-all';
		id: string;
	};

export interface NotesSearchResult {
	readonly id: string;
	readonly notes: NotesById;
}

export type NotesSearchWorkerMessage =
	NotesSearchResult;

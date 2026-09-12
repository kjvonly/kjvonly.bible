import type {
	Note,
	NotesById
} from '$lib/domains/notes/models/note.model';

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
		action: 'put-all';
		notes: Note[];
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

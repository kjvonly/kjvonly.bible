import type {
	Note,
	NotesById
} from '../../models/note.model';

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
	}
	| {
		action: 'refresh';
	};

export interface NotesSearchResult {
	readonly id: string;
	readonly notes: NotesById;
}

export type NotesSearchWorkerMessage =
	NotesSearchResult;

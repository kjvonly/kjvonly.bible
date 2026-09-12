import type {
	Note
} from '$lib/domains/notes/models/note.model';

export interface ValidatedNoteCandidate {
	readonly name:
		string;

	readonly noteId:
		string;

	readonly note:
		Omit<Note, 'id'>;
}

import type {
	Note
} from '../models/note.model';

export interface ValidatedNoteCandidate {
	readonly name:
		string;

	readonly noteId:
		string;

	readonly note:
		Omit<Note, 'id'>;
}

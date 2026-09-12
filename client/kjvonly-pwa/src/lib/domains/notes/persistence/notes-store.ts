import type {
	Note
} from '$lib/domains/notes/models/note.model';

export const NOTE_OBJECT_TYPE =
	'notes/note';

export interface NotesStore {
	get(
		id: string
	): Promise<
		Note |
		undefined
	>;

	getAll(): Promise<
		readonly Note[]
	>;

	put(
		note: Note
	): Promise<void>;
}

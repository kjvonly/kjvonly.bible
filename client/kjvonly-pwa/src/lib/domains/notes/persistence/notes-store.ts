import type {
	Note
} from '$lib/domains/notes/models/note.model';

export {
	NOTE_OBJECT_TYPE
} from '$lib/domains/notes/models/note-id';

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

	delete(
		id: string
	): Promise<void>;
}

export const NOTES_VIEWS = {
	ROOT: 'notes.root'
} as const;

export type NotesView =
	typeof NOTES_VIEWS[
		keyof typeof NOTES_VIEWS
	];

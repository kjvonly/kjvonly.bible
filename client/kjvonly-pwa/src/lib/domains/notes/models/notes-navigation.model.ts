export const NOTES_VIEWS = {
	ROOT: 'notes.root',
	ACTIONS: 'notes.actions'
} as const;

export type NotesView =
	typeof NOTES_VIEWS[
		keyof typeof NOTES_VIEWS
	];

export const NOTES_LIST_ACTIONS = {
	EXPORT_FILTERED: 'export-filtered',
	SPLIT_VERTICAL: 'split-vertical',
	SPLIT_HORIZONTAL: 'split-horizontal'
} as const;

export type NotesListAction =
	typeof NOTES_LIST_ACTIONS[
		keyof typeof NOTES_LIST_ACTIONS
	];

export const NOTES_NAVIGATION_RESULTS = {
	LIST_ACTION: 'notes.list-action'
} as const;

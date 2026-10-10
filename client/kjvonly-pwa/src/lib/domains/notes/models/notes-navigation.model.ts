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

export const NOTES_BIBLE_SCOPE_KINDS = {
	EXACT: 'exact',
	CHAPTER: 'chapter'
} as const;

export type NotesBibleScopeKind =
	typeof NOTES_BIBLE_SCOPE_KINDS[
		keyof typeof NOTES_BIBLE_SCOPE_KINDS
	];

/**
 * Defines which Bible-associated Notes belong in the Notes list.
 *
 * Scope is intentionally separate from the location used for a new Note draft.
 */
export interface NotesBibleScope {
	kind: NotesBibleScopeKind;
	bibleLocationRef: string;
}

/**
 * Serializable Notes-owned intent carried by the Notes root navigation state.
 */
export interface NotesNavigationIntent {
	noteID?: string;
	bibleScope?: NotesBibleScope;
	createBibleLocationRef?: string;
}

/**
 * Parses Notes-owned values from one navigation view state.
 *
 * @param value - Serializable Notes root navigation view state.
 * @returns Normalized Notes navigation intent.
 * @throws When a Notes-owned navigation value is invalid.
 */
export function parseNotesNavigationIntent(
	value: unknown
): NotesNavigationIntent {
	if (!isRecord(value)) {
		throw new Error(
			'Invalid Notes navigation state'
		);
	}

	const noteID = readOptionalString(
		value,
		'noteID',
		'Invalid Notes note ID state'
	);

	const createBibleLocationRef =
		readOptionalString(
			value,
			'createBibleLocationRef',
			'Invalid Notes create Bible location state'
		);

	if ('bibleLocationRef' in value) {
		throw new Error(
			'Invalid Notes Bible location state; use bibleScope'
		);
	}

	const bibleScope =
		value.bibleScope !== undefined
			? parseNotesBibleScope(
				value.bibleScope
			)
			: undefined;

	return {
		...(noteID !== undefined
			? { noteID }
			: {}),
		...(bibleScope !== undefined
			? { bibleScope }
			: {}),
		...(createBibleLocationRef !== undefined
			? { createBibleLocationRef }
			: {})
	};
}

/**
 * Parses an explicit Bible Notes scope.
 *
 * @param value - Candidate serialized Bible Notes scope.
 * @returns Validated Bible Notes scope.
 * @throws When the scope kind or Bible location reference is invalid.
 */
export function parseNotesBibleScope(
	value: unknown
): NotesBibleScope {
	if (!isRecord(value)) {
		throw new Error(
			'Invalid Notes Bible scope state'
		);
	}

	if (
		value.kind !== NOTES_BIBLE_SCOPE_KINDS.EXACT &&
		value.kind !== NOTES_BIBLE_SCOPE_KINDS.CHAPTER
	) {
		throw new Error(
			'Invalid Notes Bible scope kind'
		);
	}

	if (
		typeof value.bibleLocationRef !== 'string'
	) {
		throw new Error(
			'Invalid Notes Bible scope location state'
		);
	}

	return {
		kind: value.kind,
		bibleLocationRef:
			value.bibleLocationRef
	};
}

function readOptionalString(
	value: Record<string, unknown>,
	key: string,
	errorMessage: string
): string | undefined {
	const candidate = value[key];

	if (candidate === undefined) {
		return undefined;
	}

	if (typeof candidate !== 'string') {
		throw new Error(
			errorMessage
		);
	}

	return candidate;
}

function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value)
	);
}

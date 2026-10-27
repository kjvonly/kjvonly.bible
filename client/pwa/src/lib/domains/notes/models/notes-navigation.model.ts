import type {
	NormalizedDocumentNoteAssociation,
	NormalizedDocumentNoteIdentity,
	NormalizedDocumentNoteAddress
} from './note.model';
import type {
	NotesNormalizedDocumentScope
} from '../services/notes-normalized-document-scope';

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
 * Bible Notes navigation. An absent scope displays all Notes (including standalone
 * Notes); an explicit create location opens one Bible-associated draft.
 */
export interface NotesBibleNavigationIntent {
	noteID?: string;
	bibleScope?: NotesBibleScope;
	createBibleLocationRef?: string;
	normalizedDocument?: never;
}

/**
 * One normalized-document Notes interaction, carried as a single serializable
 * value instead of separate props through the Notes UI.
 *
 * `scope` chooses which Notes are listed. `createTarget` optionally opens one
 * draft immediately and may select a word while the list remains document-scoped.
 * `title` is display-only draft metadata, never part of document identity.
 */
export interface NotesNormalizedDocumentNavigation {
	scope: NotesNormalizedDocumentScope;
	createTarget?: NormalizedDocumentNoteAssociation;
	title?: string;
}

/** Normalized-document Notes navigation cannot also request Bible Notes. */
export interface NotesNormalizedDocumentNavigationIntent {
	noteID?: string;
	normalizedDocument: NotesNormalizedDocumentNavigation;
	bibleScope?: never;
	createBibleLocationRef?: never;
}

/** Exactly one Notes navigation context: Bible/standalone or normalized document. */
export type NotesNavigationIntent =
	| NotesBibleNavigationIntent
	| NotesNormalizedDocumentNavigationIntent;

/**
 * Routes one Notes view state to the appropriate domain-specific parser.
 *
 * @param value - Raw, serializable Notes root view state.
 * @returns Validated intent with at most one Notes association context.
 * @throws When a field is malformed or Bible/document intents are mixed.
 */
export function parseNotesNavigationIntent(
	value: unknown
): NotesNavigationIntent {
	if (!isRecord(value)) {
		throw new Error('Invalid Notes navigation state');
	}

	const noteID = readOptionalString(
		value,
		'noteID',
		'Invalid Notes note ID state'
	);

	// Pre-release flat fields are intentionally unsupported in the grouped contract.
	if (
		'normalizedDocumentScope' in value ||
		'createNormalizedDocumentTarget' in value ||
		'normalizedDocumentTitle' in value
	) {
		throw new Error('Invalid Notes normalized document state; use normalizedDocument');
	}

	if ('normalizedDocument' in value) {
		if (
			'bibleScope' in value ||
			'createBibleLocationRef' in value ||
			'bibleLocationRef' in value
		) {
			throw new Error('Cannot mix Bible and normalized document Notes navigation');
		}
		return {
			...(noteID !== undefined ? { noteID } : {}),
			...parseNotesNormalizedDocumentNavigationIntent(value.normalizedDocument)
		};
	}

	return {
		...(noteID !== undefined ? { noteID } : {}),
		...parseNotesBibleNavigationIntent(value)
	};
}

/**
 * Parses the Bible/standalone portion of Notes navigation without reading
 * normalized-document fields.
 *
 * @param value - Notes root state after choosing the Bible path.
 * @returns Validated Bible scope and optional one-time create location.
 */
export function parseNotesBibleNavigationIntent(
	value: Record<string, unknown>
): Pick<NotesBibleNavigationIntent, 'bibleScope' | 'createBibleLocationRef'> {
	if ('bibleLocationRef' in value) {
		throw new Error('Invalid Notes Bible location state; use bibleScope');
	}

	const createBibleLocationRef = readOptionalString(
		value,
		'createBibleLocationRef',
		'Invalid Notes create Bible location state'
	);
	const bibleScope = value.bibleScope === undefined
		? undefined
		: parseNotesBibleScope(value.bibleScope);

	return {
		...(bibleScope !== undefined ? { bibleScope } : {}),
		...(createBibleLocationRef !== undefined ? { createBibleLocationRef } : {})
	};
}

/**
 * Validates the single normalized-document context, independently of Bible
 * location parsing. The creation target may differ from the list scope only
 * in granularity (document versus word), never in logical document identity.
 *
 * @param value - Candidate serialized `normalizedDocument` object.
 * @returns Validated normalized-document context.
 * @throws When required scope, target, identity, or title is invalid.
 */
export function parseNotesNormalizedDocumentNavigationIntent(
	value: unknown
): Pick<NotesNormalizedDocumentNavigationIntent, 'normalizedDocument'> {
	if (!isRecord(value)) {
		throw new Error('Invalid Notes normalized document state');
	}

	const scope = parseNotesNormalizedDocumentScope(value.scope);
	const createTarget = value.createTarget === undefined
		? undefined
		: parseNotesNormalizedDocumentTarget(value.createTarget);
	const title = readOptionalString(
		value,
		'title',
		'Invalid Notes normalized document title state'
	);

	if (createTarget !== undefined && !sameDocument(scope.document, createTarget.document)) {
		throw new Error('Notes create target does not match document scope');
	}

	return {
		normalizedDocument: {
			scope,
			...(createTarget !== undefined ? { createTarget } : {}),
			...(title !== undefined ? { title } : {})
		}
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

/**
 * Validates a document-wide or canonical-word scope without revisions.
 *
 * @param value - Candidate Notes list scope.
 * @returns Canonical scope with an opaque logical Resource identity.
 * @throws When a document identity or word address is malformed.
 */
export function parseNotesNormalizedDocumentScope(
	value: unknown
): NotesNormalizedDocumentScope {
	if (!isRecord(value)) {
		throw new Error('Invalid Notes normalized document scope');
	}

	// Experimental snapshot-scoped Notes navigation is no longer supported.
	if ('documentModifiedAt' in value) {
		throw new Error('Notes word scope must not contain a document revision');
	}

	const document = parseDocumentIdentity(value.document);
	if (value.kind === 'document') {
		return { kind: 'document', document };
	}

	if (value.kind === 'word') {
		return {
			kind: 'word',
			document,
			address: parseWordAddress(value.address)
		};
	}

	throw new Error('Invalid Notes normalized document scope kind');
}

/**
 * Validates a one-time Note creation association, independently of list scope.
 *
 * @param value - Candidate document or word association.
 * @returns Validated association for the Notes draft factory.
 * @throws When the target or semantic address is invalid.
 */
export function parseNotesNormalizedDocumentTarget(
	value: unknown
): NormalizedDocumentNoteAssociation {
	if (
		!isRecord(value) ||
		value.kind !== 'normalized-document' ||
		!isRecord(value.target)
	) {
		throw new Error('Invalid Notes normalized document create target');
	}

	const scope = parseNotesNormalizedDocumentScope({
		...value.target,
		document: value.document
	});

	return {
		kind: 'normalized-document',
		document: scope.document,
		target: scope.kind === 'document'
			? { kind: 'document' }
			: {
				kind: 'word',
				address: scope.address
			}
	};
}

function parseDocumentIdentity(value: unknown): NormalizedDocumentNoteIdentity {
	if (
		!isRecord(value) ||
		'modifiedAt' in value ||
		'documentModifiedAt' in value ||
		typeof value.publisher !== 'string' ||
		value.publisher.length === 0 ||
		typeof value.resourceId !== 'string' ||
		value.resourceId.length === 0
	) {
		throw new Error('Invalid Notes normalized document identity');
	}

	return {
		publisher: value.publisher,
		resourceId: value.resourceId
	};
}

function parseWordAddress(value: unknown): NormalizedDocumentNoteAddress {
	if (
		!isRecord(value) ||
		typeof value.blockId !== 'string' ||
		value.blockId.length === 0
	) {
		throw new Error('Invalid Notes normalized word address');
	}

	return {
		blockId: value.blockId,
		contentIndex: parseNonnegativeInteger(
			value.contentIndex,
			'Invalid Notes normalized word content index'
		)
	};
}

function parseNonnegativeInteger(value: unknown, message: string): number {
	if (
		typeof value !== 'number' ||
		!Number.isSafeInteger(value) ||
		value < 0
	) {
		throw new Error(message);
	}

	return value;
}

function sameDocument(
	a: NormalizedDocumentNoteIdentity,
	b: NormalizedDocumentNoteIdentity
): boolean {
	return a.publisher === b.publisher && a.resourceId === b.resourceId;
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

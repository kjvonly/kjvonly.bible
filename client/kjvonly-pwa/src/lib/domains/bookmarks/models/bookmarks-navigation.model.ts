import { parseBookmarkTarget, parseNormalizedBookmarkDocumentReference } from '../services/bookmark-target-validation';
import type { NormalizedDocumentBookmarkTarget, NormalizedBookmarkDocumentReference } from './bookmark.model';
import { parseBookmarkDisplayMetadata } from '../services/bookmark-metadata';
import { parseBookmarkId } from './bookmark-id';

/** Persisted Bookmarks view identifiers, owned by the Bookmarks domain. */
export const BOOKMARKS_VIEWS = {
    ROOT: 'bookmarks.root',
    CONFIRM_RELOCATION: 'bookmarks.confirm-relocation',
    CONFIRM_DELETE: 'bookmarks.confirm-delete',
    ACTIONS: 'bookmarks.actions'
} as const;

export type BookmarksView =
    typeof BOOKMARKS_VIEWS[keyof typeof BOOKMARKS_VIEWS];


/** Bookmarks list More actions, following the Notes list split pattern. */
export const BOOKMARKS_LIST_ACTIONS = {
    SPLIT_HORIZONTAL: 'split-horizontal',
    SPLIT_VERTICAL: 'split-vertical'
} as const;

export type BookmarksListAction =
    typeof BOOKMARKS_LIST_ACTIONS[keyof typeof BOOKMARKS_LIST_ACTIONS];

export const BOOKMARKS_LIST_NAVIGATION_RESULTS = {
    ACTION: 'bookmarks.list-action'
} as const;

export interface BookmarksListActionResult {
    readonly type: typeof BOOKMARKS_LIST_NAVIGATION_RESULTS.ACTION;
    readonly action: BookmarksListAction;
}

/** Validate the action value before returning it from the More actions view. */
export function createBookmarksListActionResult(action: BookmarksListAction): BookmarksListActionResult {
    if (action !== BOOKMARKS_LIST_ACTIONS.SPLIT_HORIZONTAL &&
        action !== BOOKMARKS_LIST_ACTIONS.SPLIT_VERTICAL) {
        throw new Error('Invalid Bookmarks list action');
    }
    return { type: BOOKMARKS_LIST_NAVIGATION_RESULTS.ACTION, action };
}

/** Ignore unrelated navigation results; reject malformed Bookmarks list actions. */
export function parseBookmarksListActionResult(value: unknown): BookmarksListActionResult | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const state = value as Record<string, unknown>;
    if (state.type !== BOOKMARKS_LIST_NAVIGATION_RESULTS.ACTION) return null;
    return createBookmarksListActionResult(state.action as BookmarksListAction);
}

/** Browse filters stay independent of the Reader's destination-first relocation flow. */
export interface BookmarksBrowseNavigationIntent {
    readonly mode?: 'browse';
    readonly bibleChapterRef?: string;
    readonly bibleLocationRef?: string;
    /** Return a selected Bible location to the mounted Reader that opened this view. */
    readonly returnBibleLocationToReader?: boolean;
    /** Exact normalized word to list when opened from an inline Bookmark indicator. */
    readonly normalizedTarget?: NormalizedDocumentBookmarkTarget;
    /** List only Bookmarks for this logical document and return chosen word to Reader. */
    readonly normalizedDocument?: NormalizedBookmarkDocumentReference;
}

/** A Bible relocation is confirmed and persisted inside the Bookmarks Module. */
export interface BookmarksBibleRelocationNavigationIntent {
    readonly mode: 'relocate';
    readonly destinationBibleLocationRef: string;
    readonly destinationPreviewText: string;
    readonly normalizedDestination?: never;
}

/** A normalized relocation is confirmed in Bookmarks and persisted by its mounted Reader. */
export interface BookmarksNormalizedRelocationNavigationIntent {
    readonly mode: 'relocate';
    readonly normalizedDestination: NormalizedDocumentBookmarkTarget;
    readonly destinationPreviewText: string;
    readonly destinationBibleLocationRef?: never;
}

/** Both relocation variants select an existing Bookmark ID after choosing the destination. */
export type BookmarksRelocationNavigationIntent =
    | BookmarksBibleRelocationNavigationIntent
    | BookmarksNormalizedRelocationNavigationIntent;

export type BookmarksNavigationIntent =
    | BookmarksBrowseNavigationIntent
    | BookmarksRelocationNavigationIntent;

/**
 * Decode the Bookmarks-owned portion of persisted navigation state.
 *
 * This facade chooses one mode; each mode parser owns its validation. Fields
 * owned by the workspace (for example Resource selections) are ignored.
 * Bible Browse, normalized-word Browse, and relocation never share scopes.
 */
export function parseBookmarksNavigationIntent(value: unknown): BookmarksNavigationIntent {
    const state = readBookmarksNavigationState(value);
    if (state.mode === 'relocate') {
        return parseBookmarksRelocationNavigationIntent(state);
    }
    if (state.normalizedDocument !== undefined) {
        return parseBookmarksNormalizedDocumentBrowseNavigationIntent(state);
    }
    if (state.normalizedTarget !== undefined) {
        return parseBookmarksNormalizedBrowseNavigationIntent(state);
    }
    return parseBookmarksBibleBrowseNavigationIntent(state);
}

/**
 * Validate either destination-first relocation variant without mixing their
 * identities. Preview text is display metadata, never the Bookmark identity.
 */
export function parseBookmarksRelocationNavigationIntent(value: unknown): BookmarksRelocationNavigationIntent {
    const state = readBookmarksNavigationState(value);
    if (state.mode !== 'relocate') throw new Error('Invalid Bookmarks relocation mode');
    assertNoBrowseScopeForRelocation(state);
    if (state.normalizedDestination !== undefined) {
        return parseBookmarksNormalizedRelocationNavigationIntent(state);
    }
    return parseBookmarksBibleRelocationNavigationIntent(state);
}

/** Parse the existing Bible relocation format without changing its semantics. */
export function parseBookmarksBibleRelocationNavigationIntent(value: unknown): BookmarksBibleRelocationNavigationIntent {
    const state = readBookmarksNavigationState(value);
    if (state.mode !== 'relocate' || state.normalizedDestination !== undefined) {
        throw new Error('Invalid Bible Bookmark relocation state');
    }
    assertNoBrowseScopeForRelocation(state);
    const destination = parseBookmarkTarget({
        kind: 'bible', bibleLocationRef: state.destinationBibleLocationRef
    });
    if (destination.kind !== 'bible') throw new Error('Invalid Bible Bookmark destination');
    return {
        mode: 'relocate',
        destinationBibleLocationRef: destination.bibleLocationRef,
        destinationPreviewText: parseRelocationPreview(state.destinationPreviewText)
    };
}

/** Parse a normalized word destination with its opaque Resource identity. */
export function parseBookmarksNormalizedRelocationNavigationIntent(value: unknown): BookmarksNormalizedRelocationNavigationIntent {
    const state = readBookmarksNavigationState(value);
    if (state.mode !== 'relocate' || state.destinationBibleLocationRef !== undefined) {
        throw new Error('Invalid normalized Bookmark relocation state');
    }
    assertNoBrowseScopeForRelocation(state);
    const target = parseBookmarkTarget(state.normalizedDestination);
    if (target.kind !== 'normalized-document') {
        throw new Error('Invalid normalized Bookmark relocation destination');
    }
    return {
        mode: 'relocate', normalizedDestination: target,
        destinationPreviewText: parseRelocationPreview(state.destinationPreviewText)
    };
}

/** Relocation must not accidentally inherit a Bible or document Browse scope. */
function assertNoBrowseScopeForRelocation(state: Record<string, unknown>): void {
    if (state.bibleChapterRef !== undefined || state.bibleLocationRef !== undefined ||
        state.returnBibleLocationToReader !== undefined || state.normalizedTarget !== undefined ||
        state.normalizedDocument !== undefined) {
        throw new Error('Ambiguous Bookmarks relocation state');
    }
}

/** Validate the human-readable destination snapshot without interpreting it. */
function parseRelocationPreview(value: unknown): string {
    return parseBookmarkDisplayMetadata({ updatedAt: 1, previewText: value as string }).previewText;
}

/**
 * Parse a Browse request scoped to one canonical normalized-document word.
 * Disallow Bible scope/return flags and relocation fields; the target's
 * Resource identity remains opaque and is validated by the Bookmarks Domain.
 */
export function parseBookmarksNormalizedBrowseNavigationIntent(
    value: unknown
): BookmarksBrowseNavigationIntent & { readonly normalizedTarget: NormalizedDocumentBookmarkTarget } {
    const state = readBookmarksNavigationState(value);
    assertBookmarksBrowseMode(state);
    assertNoRelocationDestination(state);
    if (state.bibleChapterRef !== undefined || state.bibleLocationRef !== undefined ||
        state.returnBibleLocationToReader !== undefined || state.normalizedDocument !== undefined) {
        throw new Error('Cannot mix Bible and normalized Bookmark scopes');
    }
    const target = parseBookmarkTarget(state.normalizedTarget);
    if (target.kind !== 'normalized-document') {
        throw new Error('Invalid normalized Bookmark scope');
    }
    return {
        ...(state.mode === 'browse' ? { mode: 'browse' as const } : {}),
        normalizedTarget: target
    };
}

/**
 * Parse document-wide Browse initiated by a mounted Normalized Content Reader.
 * A document scope is distinct from the existing exact-word marker scope; it
 * returns a chosen target rather than replacing the mounted Reader.
 */
export function parseBookmarksNormalizedDocumentBrowseNavigationIntent(
    value: unknown
): BookmarksBrowseNavigationIntent & { readonly normalizedDocument: NormalizedBookmarkDocumentReference } {
    const state = readBookmarksNavigationState(value);
    assertBookmarksBrowseMode(state);
    assertNoRelocationDestination(state);
    if (state.normalizedTarget !== undefined || state.bibleChapterRef !== undefined ||
        state.bibleLocationRef !== undefined || state.returnBibleLocationToReader !== undefined) {
        throw new Error('Cannot mix normalized-document Browse and other Bookmark scopes');
    }
    return {
        ...(state.mode === 'browse' ? { mode: 'browse' as const } : {}),
        normalizedDocument: parseNormalizedBookmarkDocumentReference(state.normalizedDocument)
    };
}

/**
 * Parse unscoped, chapter-scoped, or exact Bible-location Browse requests.
 * The optional Reader-return flag belongs only to Bible Browse. Canonical
 * chapter references use the same positive decimal book/chapter grammar.
 */
export function parseBookmarksBibleBrowseNavigationIntent(value: unknown): BookmarksBrowseNavigationIntent {
    const state = readBookmarksNavigationState(value);
    assertBookmarksBrowseMode(state);
    assertNoRelocationDestination(state);
    if (state.normalizedTarget !== undefined || state.normalizedDocument !== undefined) {
        throw new Error('Cannot mix Bible and normalized Bookmark scopes');
    }
    const returnBibleLocationToReader = state.returnBibleLocationToReader;
    if (returnBibleLocationToReader !== undefined && typeof returnBibleLocationToReader !== 'boolean') {
        throw new Error('Invalid Bookmarks Reader return state');
    }
    const returnIntent = returnBibleLocationToReader === undefined
        ? {}
        : { returnBibleLocationToReader };
    const browseMode = state.mode === 'browse' ? { mode: 'browse' as const } : {};
    if (state.bibleLocationRef !== undefined) {
        if (state.bibleChapterRef !== undefined) {
            throw new Error('Ambiguous Bookmarks Bible scope');
        }
        const target = parseBookmarkTarget({ kind: 'bible', bibleLocationRef: state.bibleLocationRef });
        if (target.kind !== 'bible') {
            throw new Error('Invalid Bookmarks exact location');
        }
        return { bibleLocationRef: target.bibleLocationRef, ...returnIntent, ...browseMode };
    }
    if (state.bibleChapterRef === undefined) {
        return { ...returnIntent, ...browseMode };
    }
    return {
        bibleChapterRef: parseBookmarksBibleChapterRef(state.bibleChapterRef),
        ...returnIntent,
        ...browseMode
    };
}

/** Validate the canonical `<book>_<chapter>` Browse scope, not a verse. */
export function parseBookmarksBibleChapterRef(value: unknown): string {
    if (typeof value !== 'string') {
        throw new Error('Invalid Bookmarks chapter state');
    }
    const parts = value.split('_');
    if (parts.length !== 2 || !parts.every((part) => {
        const number = Number(part);
        return Number.isSafeInteger(number) && number > 0 && String(number) === part;
    })) {
        throw new Error('Invalid Bookmarks chapter state');
    }
    return value;
}

/** Only a plain object can contain persisted Bookmarks navigation values. */
function readBookmarksNavigationState(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Invalid Bookmarks navigation state');
    }
    return value as Record<string, unknown>;
}

/** Browse cannot carry an unrecognized mode or a relocation mode. */
function assertBookmarksBrowseMode(state: Record<string, unknown>): void {
    if (state.mode !== undefined && state.mode !== 'browse') {
        throw new Error('Invalid Bookmarks navigation mode');
    }
}

/** Relocation destination data is only valid when mode is `relocate`. */
function assertNoRelocationDestination(state: Record<string, unknown>): void {
    if (state.destinationBibleLocationRef !== undefined || state.destinationPreviewText !== undefined ||
        state.normalizedDestination !== undefined) {
        throw new Error('Relocation destination requires relocation mode');
    }
}

/** A selected Bookmark location returned to the Bible Reader that opened Browse. */
export const BOOKMARKS_NAVIGATION_RESULTS = {
    BIBLE_LOCATION_SELECTED: 'bookmarks.bible-location-selected',
    NORMALIZED_WORD_SELECTED: 'bookmarks.normalized-word-selected'
} as const;

export type BookmarkBrowseNavigationResult = {
    readonly type: typeof BOOKMARKS_NAVIGATION_RESULTS.BIBLE_LOCATION_SELECTED;
    readonly bibleLocationRef: string;
}

/** Create a result containing a canonical version-independent Bible location. */
export function createBookmarkBrowseNavigationResult(
    bibleLocationRef: string
): BookmarkBrowseNavigationResult {
    const target = parseBookmarkTarget({ kind: 'bible', bibleLocationRef });
    if (target.kind !== 'bible') {
        throw new Error('Invalid Bookmarks Bible navigation result');
    }
    return {
        type: BOOKMARKS_NAVIGATION_RESULTS.BIBLE_LOCATION_SELECTED,
        bibleLocationRef: target.bibleLocationRef
    };
}

/** Parse only Bookmarks-owned Browse results; reject malformed owned results. */
export function parseBookmarkBrowseNavigationResult(
    value: unknown
): BookmarkBrowseNavigationResult | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return null;
    }
    const state = value as Record<string, unknown>;
    if (state.type !== BOOKMARKS_NAVIGATION_RESULTS.BIBLE_LOCATION_SELECTED) {
        return null;
    }
    if (typeof state.bibleLocationRef !== 'string') {
        throw new Error('Invalid Bookmarks Bible navigation result');
    }
    return createBookmarkBrowseNavigationResult(state.bibleLocationRef);
}

/** A typed result for returning one normalized word to its originating Reader. */
export interface NormalizedBookmarkBrowseNavigationResult {
    readonly type: typeof BOOKMARKS_NAVIGATION_RESULTS.NORMALIZED_WORD_SELECTED;
    readonly target: NormalizedDocumentBookmarkTarget;
}

/** Validate the chosen target before handing it to pane navigation. */
export function createNormalizedBookmarkBrowseNavigationResult(
    value: unknown
): NormalizedBookmarkBrowseNavigationResult {
    const target = parseBookmarkTarget(value);
    if (target.kind !== 'normalized-document') {
        throw new Error('Invalid normalized Bookmark navigation result');
    }
    return { type: BOOKMARKS_NAVIGATION_RESULTS.NORMALIZED_WORD_SELECTED, target };
}

/** Ignore other modules' results and reject malformed owned word results. */
export function parseNormalizedBookmarkBrowseNavigationResult(
    value: unknown
): NormalizedBookmarkBrowseNavigationResult | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const state = value as Record<string, unknown>;
    if (state.type !== BOOKMARKS_NAVIGATION_RESULTS.NORMALIZED_WORD_SELECTED) return null;
    return createNormalizedBookmarkBrowseNavigationResult(state.target);
}

/** Confirmations keep only the existing ID and the chosen destination. */
export type BookmarkRelocationConfirmationState =
    | { readonly bookmarkId: string; readonly destinationBibleLocationRef: string;
        readonly destinationPreviewText: string; readonly normalizedDestination?: never }
    | { readonly bookmarkId: string; readonly normalizedDestination: NormalizedDocumentBookmarkTarget;
        readonly destinationPreviewText: string; readonly destinationBibleLocationRef?: never };

/** Preserve the existing Bible confirmation payload and validate normalized destinations. */
export function parseBookmarkRelocationConfirmationState(value: unknown): BookmarkRelocationConfirmationState {
    const state = readBookmarksNavigationState(value);
    if (typeof state.bookmarkId !== 'string') throw new Error('Invalid Bookmark relocation ID');
    parseBookmarkId(state.bookmarkId);
    const intent = parseBookmarksRelocationNavigationIntent({ ...state, mode: 'relocate' });
    if (intent.normalizedDestination !== undefined) {
        return { bookmarkId: state.bookmarkId, normalizedDestination: intent.normalizedDestination,
            destinationPreviewText: intent.destinationPreviewText };
    }
    return { bookmarkId: state.bookmarkId, destinationBibleLocationRef: intent.destinationBibleLocationRef,
        destinationPreviewText: intent.destinationPreviewText };
}

/** The deletion view carries an ID, never an implicit target or list index. */
export interface BookmarkDeleteConfirmationState {
    readonly bookmarkId: string;
}

/** Validate only the Bookmarks-owned deletion field in a navigation entry. */
export function parseBookmarkDeleteConfirmationState(value: unknown): BookmarkDeleteConfirmationState {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Invalid Bookmark deletion confirmation state');
    }
    const state = value as Record<string, unknown>;
    if (typeof state.bookmarkId !== 'string') {
        throw new Error('Invalid Bookmark deletion ID');
    }
    parseBookmarkId(state.bookmarkId);
    return { bookmarkId: state.bookmarkId };
}

export const BOOKMARKS_RELOCATION_RESULTS = {
    COMPLETED: 'bookmarks.relocation-completed'
} as const;

/** Only a successfully saved relocation produces this result. */
export function createBookmarkRelocationCompletedResult(destinationBibleLocationRef: string) {
    const target = parseBookmarkTarget({ kind: 'bible', bibleLocationRef: destinationBibleLocationRef });
    if (target.kind !== 'bible') throw new Error('Invalid completed Bookmark relocation');
    return {
        type: BOOKMARKS_RELOCATION_RESULTS.COMPLETED,
        bibleLocationRef: target.bibleLocationRef
    } as const;
}

export function parseBookmarkRelocationCompletedResult(value: unknown):
    ReturnType<typeof createBookmarkRelocationCompletedResult> | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const state = value as Record<string, unknown>;
    if (state.type !== BOOKMARKS_RELOCATION_RESULTS.COMPLETED) return null;
    return createBookmarkRelocationCompletedResult(state.bibleLocationRef as string);
}

/** Result returned from normalized relocation confirmation to the mounted Reader. */
export const NORMALIZED_BOOKMARK_RELOCATION_CONFIRMED = 'bookmarks.normalized-relocation-confirmed' as const;

export interface NormalizedBookmarkRelocationConfirmedResult {
    readonly type: typeof NORMALIZED_BOOKMARK_RELOCATION_CONFIRMED;
    readonly bookmarkId: string;
    readonly target: NormalizedDocumentBookmarkTarget;
    readonly previewText: string;
}

/** Validate the chosen existing ID and destination before crossing navigation. */
export function createNormalizedBookmarkRelocationConfirmedResult(
    bookmarkId: string, target: unknown, previewText: unknown
): NormalizedBookmarkRelocationConfirmedResult {
    parseBookmarkId(bookmarkId);
    const validated = parseBookmarkTarget(target);
    if (validated.kind !== 'normalized-document') throw new Error('Invalid normalized relocation target');
    return {
        type: NORMALIZED_BOOKMARK_RELOCATION_CONFIRMED,
        bookmarkId, target: validated, previewText: parseRelocationPreview(previewText)
    };
}

/** Ignore unrelated navigation results; reject malformed owned confirmations. */
export function parseNormalizedBookmarkRelocationConfirmedResult(
    value: unknown
): NormalizedBookmarkRelocationConfirmedResult | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const result = value as Record<string, unknown>;
    if (result.type !== NORMALIZED_BOOKMARK_RELOCATION_CONFIRMED) return null;
    if (typeof result.bookmarkId !== 'string') throw new Error('Invalid normalized relocation Bookmark ID');
    return createNormalizedBookmarkRelocationConfirmedResult(
        result.bookmarkId, result.target, result.previewText
    );
}

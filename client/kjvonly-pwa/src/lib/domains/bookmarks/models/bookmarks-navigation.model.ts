import { parseBookmarkTarget } from '../services/bookmark-target-validation';
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
}

/** The Reader chooses the destination; Bookmarks chooses the existing Bookmark. */
export interface BookmarksRelocationNavigationIntent {
    readonly mode: 'relocate';
    readonly destinationBibleLocationRef: string;
    readonly destinationPreviewText: string;
}

export type BookmarksNavigationIntent =
    | BookmarksBrowseNavigationIntent
    | BookmarksRelocationNavigationIntent;

/**
 * Parse Bookmarks-owned Browse scope or destination-first relocation state.
 * Browse chapter and exact verse/word filters are mutually exclusive; neither
 * is a relocation destination. Ignore application-owned navigation fields,
 * including Resource selections.
 */
export function parseBookmarksNavigationIntent(value: unknown): BookmarksNavigationIntent {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Invalid Bookmarks navigation state');
    }
    const state = value as Record<string, unknown>;
    if (state.mode === 'relocate') {
        if (state.bibleChapterRef !== undefined || state.bibleLocationRef !== undefined ||
            state.returnBibleLocationToReader !== undefined) {
            throw new Error('Ambiguous Bookmarks relocation state');
        }
        const destination = parseBookmarkTarget({
            kind: 'bible', bibleLocationRef: state.destinationBibleLocationRef
        });
        if (destination.kind !== 'bible') throw new Error('Invalid Bookmark relocation destination');
        const preview = parseBookmarkDisplayMetadata({
            updatedAt: 1, previewText: state.destinationPreviewText as string
        });
        return {
            mode: 'relocate',
            destinationBibleLocationRef: destination.bibleLocationRef,
            destinationPreviewText: preview.previewText
        };
    }
    if (state.mode !== undefined && state.mode !== 'browse') {
        throw new Error('Invalid Bookmarks navigation mode');
    }
    if (state.destinationBibleLocationRef !== undefined || state.destinationPreviewText !== undefined) {
        throw new Error('Relocation destination requires relocation mode');
    }
    const browseMode = state.mode === 'browse' ? { mode: 'browse' as const } : {};
    const returnBibleLocationToReader = state.returnBibleLocationToReader;
    if (returnBibleLocationToReader !== undefined && typeof returnBibleLocationToReader !== 'boolean') {
        throw new Error('Invalid Bookmarks Reader return state');
    }
    const returnIntent = returnBibleLocationToReader === undefined
        ? {}
        : { returnBibleLocationToReader };
    if (state.bibleLocationRef !== undefined) {
        if (state.bibleChapterRef !== undefined) {
            throw new Error('Ambiguous Bookmarks Bible scope');
        }
        const target = parseBookmarkTarget({
            kind: 'bible',
            bibleLocationRef: state.bibleLocationRef
        });
        if (target.kind !== 'bible') {
            throw new Error('Invalid Bookmarks exact location');
        }
        return { bibleLocationRef: target.bibleLocationRef, ...returnIntent, ...browseMode };
    }
    if (state.bibleChapterRef === undefined) {
        return { ...returnIntent, ...browseMode };
    }
    const chapter = state.bibleChapterRef;
    if (typeof chapter !== 'string') {
        throw new Error('Invalid Bookmarks chapter state');
    }
    const parts = chapter.split('_');
    if (parts.length !== 2 || !parts.every((part) => {
        const n = Number(part);
        return Number.isSafeInteger(n) && n > 0 && String(n) === part;
    })) {
        throw new Error('Invalid Bookmarks chapter state');
    }
    return { bibleChapterRef: chapter, ...returnIntent, ...browseMode };
}

/** A selected Bookmark location returned to the Bible Reader that opened Browse. */
export const BOOKMARKS_NAVIGATION_RESULTS = {
    BIBLE_LOCATION_SELECTED: 'bookmarks.bible-location-selected'
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

/** Confirm view stores only the chosen Bookmark ID and destination snapshot. */
export interface BookmarkRelocationConfirmationState {
    readonly bookmarkId: string;
    readonly destinationBibleLocationRef: string;
    readonly destinationPreviewText: string;
}

export function parseBookmarkRelocationConfirmationState(value: unknown): BookmarkRelocationConfirmationState {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Invalid Bookmark relocation confirmation state');
    }
    const state = value as Record<string, unknown>;
    if (typeof state.bookmarkId !== 'string') throw new Error('Invalid Bookmark relocation ID');
    parseBookmarkId(state.bookmarkId);
    const intent = parseBookmarksNavigationIntent({
        mode: 'relocate',
        destinationBibleLocationRef: state.destinationBibleLocationRef,
        destinationPreviewText: state.destinationPreviewText
    });
    if (intent.mode !== 'relocate') throw new Error('Invalid Bookmark relocation confirmation');
    return { bookmarkId: state.bookmarkId, destinationBibleLocationRef: intent.destinationBibleLocationRef, destinationPreviewText: intent.destinationPreviewText };
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

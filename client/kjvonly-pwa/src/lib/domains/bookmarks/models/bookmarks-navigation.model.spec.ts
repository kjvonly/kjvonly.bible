import { describe, expect, it } from 'vitest';
import {
    BOOKMARKS_NAVIGATION_RESULTS,
    createBookmarkBrowseNavigationResult,
    createBookmarkRelocationCompletedResult,
    parseBookmarkRelocationCompletedResult,
    parseBookmarkRelocationConfirmationState,
    parseBookmarkDeleteConfirmationState,
    parseBookmarkBrowseNavigationResult,
    parseBookmarksNavigationIntent,
    BOOKMARKS_LIST_ACTIONS,
    BOOKMARKS_VIEWS,
    createBookmarksListActionResult,
    parseBookmarksListActionResult
} from './bookmarks-navigation.model';

describe('Bookmarks navigation intent', () => {
    it('accepts all-Bookmarks, chapter, and exact word or verse views', () => {
        expect(parseBookmarksNavigationIntent({})).toEqual({});
        expect(parseBookmarksNavigationIntent({ bibleChapterRef: '43_3' }))
            .toEqual({ bibleChapterRef: '43_3' });
        expect(parseBookmarksNavigationIntent({ bibleLocationRef: '43_3_16_0' }))
            .toEqual({ bibleLocationRef: '43_3_16_0' });
        expect(parseBookmarksNavigationIntent({ bibleLocationRef: '43_3_16_7' }))
            .toEqual({ bibleLocationRef: '43_3_16_7' });
        expect(parseBookmarksNavigationIntent({ returnBibleLocationToReader: true }))
            .toEqual({ returnBibleLocationToReader: true });
        expect(parseBookmarksNavigationIntent({
            bibleLocationRef: '43_3_16_7', returnBibleLocationToReader: true
        })).toEqual({
            bibleLocationRef: '43_3_16_7', returnBibleLocationToReader: true
        });
    });

    it('reads only Bookmarks-owned intent from navigation view state', () => {
        expect(parseBookmarksNavigationIntent({
            resourceSelections: { 'bible/chapters': { pubkey: 'publisher', resourceId: 'chapters' } },
            otherViewState: 'preserved by navigation',
            bibleChapterRef: '43_3',
            returnBibleLocationToReader: true
        })).toEqual({ bibleChapterRef: '43_3', returnBibleLocationToReader: true });
        expect(parseBookmarksNavigationIntent({
            resourceSelections: {},
            bibleLocationRef: '43_3_16_7'
        })).toEqual({ bibleLocationRef: '43_3_16_7' });
        expect(parseBookmarksNavigationIntent({ resourceSelections: {}, noteID: 'unrelated' }))
            .toEqual({});
    });

    it.each([
        null, [], { bibleLocationRef: 'kjv/43_3_16_0' },
        { bibleLocationRef: '43_3_16' },
        { bibleLocationRef: '43_3_16_0', bibleChapterRef: '43_3' },
        { bibleChapterRef: 'kjv/43_3' },
        { bibleChapterRef: '43_3_16' },
        { bibleChapterRef: '43_0' },
        { bibleChapterRef: '043_3' },
        { bibleChapterRef: 43 },
        { returnBibleLocationToReader: 'true' },
        { returnBibleLocationToReader: 1 },
        { bibleLocationRef: '43_3_16_0', bibleChapterRef: '43_3', resourceSelections: {} }
    ])('rejects ambiguous or invalid state: %j', (value) => {
        expect(() => parseBookmarksNavigationIntent(value)).toThrow();
    });
});


describe('Bookmark Browse navigation result', () => {
    it('returns an exact version-independent Bible location', () => {
        const result = createBookmarkBrowseNavigationResult('43_3_16_0');
        expect(result).toEqual({
            type: BOOKMARKS_NAVIGATION_RESULTS.BIBLE_LOCATION_SELECTED,
            bibleLocationRef: '43_3_16_0'
        });
        expect(parseBookmarkBrowseNavigationResult(result)).toEqual(result);
        expect(parseBookmarkBrowseNavigationResult({ type: 'bible.menu-action' })).toBeNull();
    });

    it.each([
        '43_3_16',
        'kjv/43_3_16_7',
        '43_0_16_0',
        '43_3_16_-1'
    ])('rejects non-canonical Browse results: %s', (bibleLocationRef) => {
        expect(() => createBookmarkBrowseNavigationResult(bibleLocationRef)).toThrow();
    });

    it('rejects malformed owned results, but ignores unrelated results', () => {
        expect(() => parseBookmarkBrowseNavigationResult({
            type: BOOKMARKS_NAVIGATION_RESULTS.BIBLE_LOCATION_SELECTED,
            bibleLocationRef: 123
        })).toThrow();
        expect(parseBookmarkBrowseNavigationResult(null)).toBeNull();
        expect(parseBookmarkBrowseNavigationResult({ type: 'other' })).toBeNull();
    });
});


describe('destination-first Bookmark relocation navigation', () => {
    const destination = {
        mode: 'relocate' as const,
        destinationBibleLocationRef: '43_4_12_7',
        destinationPreviewText: 'The full destination verse is captured by the Bible Reader.'
    };
    const id = 'publisher/default/123e4567-e89b-42d3-a456-426614174000';

    it('preserves the exact destination and preview without inspecting Resource selections', () => {
        expect(parseBookmarksNavigationIntent({
            ...destination,
            resourceSelections: { other: 'application-owned' }
        })).toEqual(destination);
        expect(parseBookmarkRelocationConfirmationState({
            bookmarkId: id,
            ...destination,
            resourceSelections: {}
        })).toEqual({
            bookmarkId: id,
            destinationBibleLocationRef: destination.destinationBibleLocationRef,
            destinationPreviewText: destination.destinationPreviewText
        });
    });

    it.each([
        { mode: 'relocate', destinationBibleLocationRef: '43_3', destinationPreviewText: 'verse' },
        { mode: 'relocate', destinationBibleLocationRef: '43_4_12_0' },
        { mode: 'relocate', destinationBibleLocationRef: '43_4_12_0', destinationPreviewText: '<script>' },
        { mode: 'relocate', ...destination, bibleChapterRef: '43_3' },
        { mode: 'relocate', ...destination, returnBibleLocationToReader: true },
        { mode: 'unexpected' },
        { destinationBibleLocationRef: '43_4_12_0', destinationPreviewText: 'verse' }
    ])('rejects malformed or ambiguous relocation states: %j', (value) => {
        expect(() => parseBookmarksNavigationIntent(value)).toThrow();
    });

    it('rejects malformed confirmation identities and keeps the target exact', () => {
        expect(() => parseBookmarkRelocationConfirmationState({
            bookmarkId: 'bad-id', ...destination
        })).toThrow();
        expect(() => parseBookmarkRelocationConfirmationState({
            bookmarkId: id, ...destination, destinationBibleLocationRef: '43_4_12'
        })).toThrow();
    });

    it('only forwards an explicitly completed relocation', () => {
        const result = createBookmarkRelocationCompletedResult(destination.destinationBibleLocationRef);
        expect(parseBookmarkRelocationCompletedResult(result)).toEqual(result);
        expect(parseBookmarkRelocationCompletedResult({ type: 'other' })).toBeNull();
        expect(() => parseBookmarkRelocationCompletedResult({
            type: result.type, bibleLocationRef: '43_4_12'
        })).toThrow();
    });
});


describe('Bookmark deletion confirmation navigation', () => {
    const id = 'publisher/default/123e4567-e89b-42d3-a456-426614174000';

    it('preserves only the selected Bookmark ID, not application Resource selections', () => {
        expect(parseBookmarkDeleteConfirmationState({
            bookmarkId: id,
            resourceSelections: { 'bible/booknames': {} }
        })).toEqual({ bookmarkId: id });
    });

    it.each([
        null, [], {}, { bookmarkId: 12 },
        { bookmarkId: '43_3_16_0' }, { bookmarkId: 'publisher/default/not-a-uuid' }
    ])('rejects invalid deletion selections: %j', (value) => {
        expect(() => parseBookmarkDeleteConfirmationState(value)).toThrow();
    });
});


describe('Bookmarks list More actions', () => {
    it('registers a distinct More actions view', () => {
        expect(BOOKMARKS_VIEWS.ACTIONS).toBe('bookmarks.actions');
    });

    it('round-trips both split actions and ignores unrelated navigation results', () => {
        for (const action of [BOOKMARKS_LIST_ACTIONS.SPLIT_HORIZONTAL, BOOKMARKS_LIST_ACTIONS.SPLIT_VERTICAL]) {
            const result = createBookmarksListActionResult(action);
            expect(parseBookmarksListActionResult(result)).toEqual(result);
            expect(parseBookmarksListActionResult({ ...result, resourceSelections: {} })).toEqual(result);
        }
        expect(parseBookmarksListActionResult({ type: 'bookmarks.bible-location-selected' })).toBeNull();
        expect(parseBookmarksListActionResult(null)).toBeNull();
    });

    it('rejects invalid owned commands', () => {
        expect(() => parseBookmarksListActionResult({ type: 'bookmarks.list-action', action: 'delete' })).toThrow();
    });
});

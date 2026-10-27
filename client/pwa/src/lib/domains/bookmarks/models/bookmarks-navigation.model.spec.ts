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
    parseBookmarksBibleBrowseNavigationIntent,
    parseBookmarksNormalizedBrowseNavigationIntent,
    parseBookmarksNormalizedDocumentBrowseNavigationIntent,
    createNormalizedBookmarkBrowseNavigationResult,
    parseNormalizedBookmarkBrowseNavigationResult,
    parseBookmarksRelocationNavigationIntent,
    parseBookmarksNormalizedRelocationNavigationIntent,
    createNormalizedBookmarkRelocationConfirmedResult,
    parseNormalizedBookmarkRelocationConfirmedResult,
    parseBookmarksBibleChapterRef,
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

    it('accepts an exact normalized-word scope without mixing Bible fields', () => {
        const normalizedTarget = {
            kind: 'normalized-document' as const,
            document: { publisher: 'publisher', resourceId: 'documents/a/%20/b' },
            address: { kind: 'word' as const, blockId: '__proto__', contentIndex: 2 }
        };
        expect(parseBookmarksNavigationIntent({ mode: 'browse', normalizedTarget }))
            .toEqual({ mode: 'browse', normalizedTarget });
        expect(() => parseBookmarksNavigationIntent({ normalizedTarget, bibleLocationRef: '1_1_1_0' })).toThrow();
        expect(() => parseBookmarksNavigationIntent({ normalizedTarget, returnBibleLocationToReader: true })).toThrow();
        expect(() => parseBookmarksNavigationIntent({ normalizedTarget, mode: 'relocate' })).toThrow();
        expect(() => parseBookmarksNavigationIntent({ normalizedTarget: {
            ...normalizedTarget, address: { kind: 'word', blockId: '__proto__', contentIndex: -1 }
        } })).toThrow();
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


describe('Bookmarks navigation mode parsers', () => {
    const normalizedTarget = {
        kind: 'normalized-document' as const,
        document: { publisher: 'owner', resourceId: 'a/b/%20' },
        address: { kind: 'word' as const, blockId: '__proto__', contentIndex: 3 }
    };
    const relocation = {
        mode: 'relocate' as const,
        destinationBibleLocationRef: '43_4_12_7',
        destinationPreviewText: 'Relocation preview'
    };

    it('parses Bible Browse independently of normalized-document and relocation state', () => {
        expect(parseBookmarksBibleBrowseNavigationIntent({ bibleChapterRef: '43_3' }))
            .toEqual({ bibleChapterRef: '43_3' });
        expect(parseBookmarksBibleBrowseNavigationIntent({
            mode: 'browse', bibleLocationRef: '43_3_16_0', returnBibleLocationToReader: false
        })).toEqual({ mode: 'browse', bibleLocationRef: '43_3_16_0', returnBibleLocationToReader: false });
        expect(() => parseBookmarksBibleBrowseNavigationIntent({ normalizedTarget })).toThrow();
        expect(() => parseBookmarksBibleBrowseNavigationIntent(relocation)).toThrow();
        expect(() => parseBookmarksBibleBrowseNavigationIntent({ bibleChapterRef: '43_3', bibleLocationRef: '43_3_1_0' })).toThrow();
    });

    it('validates the canonical Bible chapter with its own helper', () => {
        expect(parseBookmarksBibleChapterRef('43_3')).toBe('43_3');
        for (const value of ['043_3', '43_0', '43_3_1', 43, '43_03', '43_1e1']) {
            expect(() => parseBookmarksBibleChapterRef(value)).toThrow();
        }
    });

    it('parses normalized-word Browse without accepting Bible fields or relocation', () => {
        expect(parseBookmarksNormalizedBrowseNavigationIntent({ normalizedTarget }))
            .toEqual({ normalizedTarget });
        expect(parseBookmarksNormalizedBrowseNavigationIntent({ mode: 'browse', normalizedTarget }))
            .toEqual({ mode: 'browse', normalizedTarget });
        expect(() => parseBookmarksNormalizedBrowseNavigationIntent({ normalizedTarget, bibleChapterRef: '43_3' })).toThrow();
        expect(() => parseBookmarksNormalizedBrowseNavigationIntent({ normalizedTarget, returnBibleLocationToReader: false })).toThrow();
        expect(() => parseBookmarksNormalizedBrowseNavigationIntent({ ...relocation, normalizedTarget })).toThrow();
        expect(() => parseBookmarksNormalizedBrowseNavigationIntent({ normalizedTarget: { kind: 'bible', bibleLocationRef: '43_3_16_0' } })).toThrow();
    });

    it('parses a document-wide normalized Browse scope without mixing contexts', () => {
        const normalizedDocument = normalizedTarget.document;
        expect(parseBookmarksNavigationIntent({ mode: 'browse', normalizedDocument }))
            .toEqual({ mode: 'browse', normalizedDocument });
        expect(parseBookmarksNormalizedDocumentBrowseNavigationIntent({ normalizedDocument }))
            .toEqual({ normalizedDocument });
        expect(() => parseBookmarksNavigationIntent({ normalizedDocument, normalizedTarget })).toThrow();
        expect(() => parseBookmarksNavigationIntent({ normalizedDocument, bibleChapterRef: '43_3' })).toThrow();
        expect(() => parseBookmarksNavigationIntent({ normalizedDocument, returnBibleLocationToReader: false })).toThrow();
        expect(() => parseBookmarksNavigationIntent({ ...relocation, normalizedDocument })).toThrow();
        expect(() => parseBookmarksNavigationIntent({ normalizedDocument: { ...normalizedDocument, modifiedAt: 42 } })).toThrow();
        expect(() => parseBookmarksNavigationIntent({ normalizedDocument: { publisher: '', resourceId: 'a' } })).toThrow();
        expect(() => parseBookmarksNormalizedBrowseNavigationIntent({ normalizedTarget, normalizedDocument })).toThrow();
        expect(() => parseBookmarksBibleBrowseNavigationIntent({ normalizedDocument })).toThrow();
    });

    it('parses relocation without allowing a Browse scope', () => {
        expect(parseBookmarksRelocationNavigationIntent(relocation)).toEqual(relocation);
        expect(() => parseBookmarksRelocationNavigationIntent({ ...relocation, normalizedTarget })).toThrow();
        expect(() => parseBookmarksRelocationNavigationIntent({ ...relocation, bibleLocationRef: '43_3_16_0' })).toThrow();
        expect(() => parseBookmarksRelocationNavigationIntent({ ...relocation, mode: 'browse' })).toThrow();
        expect(() => parseBookmarksRelocationNavigationIntent({ ...relocation, destinationPreviewText: '<script>' })).toThrow();
    });

    it('facade dispatches to the same mode-specific results', () => {
        const bible = { bibleChapterRef: '43_3' };
        const normalized = { normalizedTarget };
        expect(parseBookmarksNavigationIntent(bible)).toEqual(parseBookmarksBibleBrowseNavigationIntent(bible));
        expect(parseBookmarksNavigationIntent(normalized)).toEqual(parseBookmarksNormalizedBrowseNavigationIntent(normalized));
        expect(parseBookmarksNavigationIntent(relocation)).toEqual(parseBookmarksRelocationNavigationIntent(relocation));
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


describe('Normalized Bookmark Browse result', () => {
    const target = {
        kind: 'normalized-document' as const,
        document: { publisher: 'publisher', resourceId: 'a/%20/b' },
        address: { kind: 'word' as const, blockId: '__proto__', contentIndex: 12 }
    };
    it('returns the entire validated opaque Resource and canonical word target', () => {
        const result = createNormalizedBookmarkBrowseNavigationResult(target);
        expect(result).toEqual({ type: BOOKMARKS_NAVIGATION_RESULTS.NORMALIZED_WORD_SELECTED, target });
        expect(parseNormalizedBookmarkBrowseNavigationResult(result)).toEqual(result);
        expect(parseNormalizedBookmarkBrowseNavigationResult({ type: 'other', target })).toBeNull();
    });
    it('rejects malformed owned results and Bible targets', () => {
        expect(() => createNormalizedBookmarkBrowseNavigationResult({ kind: 'bible', bibleLocationRef: '43_3_16_0' })).toThrow();
        expect(() => parseNormalizedBookmarkBrowseNavigationResult({
            type: BOOKMARKS_NAVIGATION_RESULTS.NORMALIZED_WORD_SELECTED,
            target: { ...target, address: { ...target.address, contentIndex: -1 } }
        })).toThrow();
        expect(() => parseNormalizedBookmarkBrowseNavigationResult({
            type: BOOKMARKS_NAVIGATION_RESULTS.NORMALIZED_WORD_SELECTED,
            target: { ...target, document: { ...target.document, modifiedAt: 33 } }
        })).toThrow();
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


describe('normalized destination-first Bookmark relocation', () => {
    const normalizedDestination = {
        kind: 'normalized-document' as const,
        document: { publisher: 'source', resourceId: 'content/%2F/source/a' },
        address: { kind: 'word' as const, blockId: '__proto__', contentIndex: 7 }
    };
    const destinationPreviewText = 'Word within its canonical document context';
    const bookmarkId = 'publisher/default/123e4567-e89b-42d3-a456-426614174000';
    const relocation = { mode: 'relocate' as const, normalizedDestination, destinationPreviewText };

    it('dispatches through a dedicated normalized parser and preserves Resource identity', () => {
        expect(parseBookmarksNavigationIntent(relocation)).toEqual(relocation);
        expect(parseBookmarksNormalizedRelocationNavigationIntent(relocation)).toEqual(relocation);
        expect(parseBookmarksNavigationIntent({ ...relocation, resourceSelections: {} })).toEqual(relocation);
    });

    it('keeps the same ID and destination through confirmation and return results', () => {
        expect(parseBookmarkRelocationConfirmationState({ bookmarkId, ...relocation })).toEqual({
            bookmarkId, normalizedDestination, destinationPreviewText
        });
        const result = createNormalizedBookmarkRelocationConfirmedResult(
            bookmarkId, normalizedDestination, destinationPreviewText
        );
        expect(parseNormalizedBookmarkRelocationConfirmedResult(result)).toEqual(result);
        expect(parseNormalizedBookmarkRelocationConfirmedResult({ type: 'some-other-result' })).toBeNull();
    });

    it.each([
        { ...relocation, destinationBibleLocationRef: '43_3_16_0' },
        { ...relocation, bibleLocationRef: '43_3_16_0' },
        { ...relocation, normalizedDocument: normalizedDestination.document },
        { ...relocation, normalizedDestination: { ...normalizedDestination,
            address: { kind: 'word', blockId: '__proto__', contentIndex: -1 } } },
        { ...relocation, destinationPreviewText: '<script>' },
        { ...relocation, mode: 'browse' }
    ])('rejects mixed or malformed relocation state: %j', (state) => {
        expect(() => parseBookmarksNavigationIntent(state)).toThrow();
    });

    it('rejects bad confirmation IDs and malformed confirmed targets', () => {
        expect(() => parseBookmarkRelocationConfirmationState({
            bookmarkId: 'invalid-id', ...relocation
        })).toThrow();
        expect(() => parseNormalizedBookmarkRelocationConfirmedResult({
            type: 'bookmarks.normalized-relocation-confirmed', bookmarkId,
            target: { ...normalizedDestination, document: { ...normalizedDestination.document, modifiedAt: 100 } },
            previewText: destinationPreviewText
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

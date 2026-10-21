import { describe, expect, it } from 'vitest';
import type { Bookmark, NormalizedDocumentBookmarkTarget } from '../models/bookmark.model';
import {
    filterBookmarksAtNormalizedWord,
    filterBookmarksForNavigation,
    filterBookmarksForNormalizedDocument,
    filterRelocatableBibleBookmarks,
    filterRelocatableNormalizedBookmarks
} from './bookmarks-navigation-filter';

const normalizedTarget: NormalizedDocumentBookmarkTarget = {
    kind: 'normalized-document',
    document: { publisher: 'owner', resourceId: 'documents/%/one' },
    address: { kind: 'word', blockId: '__proto__', contentIndex: 2 }
};

const bookmarks: readonly Bookmark[] = [
    { id: 'bible-1', target: { kind: 'bible', bibleLocationRef: '43_3_16_0' }, updatedAt: 1, previewText: '' },
    { id: 'bible-2', target: { kind: 'bible', bibleLocationRef: '43_4_1_0' }, updatedAt: 2, previewText: '' },
    { id: 'word-1', target: normalizedTarget, updatedAt: 3, previewText: '' },
    { id: 'word-2', target: normalizedTarget, updatedAt: 4, previewText: '' },
    { id: 'other-word', target: { ...normalizedTarget, address: { ...normalizedTarget.address, contentIndex: 3 } }, updatedAt: 5, previewText: '' },
    { id: 'other-document', target: { ...normalizedTarget, document: { publisher: 'other', resourceId: normalizedTarget.document.resourceId } }, updatedAt: 6, previewText: '' },
    { id: 'other-resource', target: { ...normalizedTarget, document: { publisher: 'owner', resourceId: 'documents/one' } }, updatedAt: 7, previewText: '' }
];

const bibleRefs = {
    extractBookIDChapter: (ref: string) => ref.split('_').slice(0, 2).join('_')
};

const ids = (values: readonly Bookmark[]) => values.map((bookmark) => bookmark.id);

describe('Bookmarks navigation list filtering', () => {
    it('limits relocation to Bible Bookmarks without changing source order', () => {
        expect(ids(filterRelocatableBibleBookmarks(bookmarks)))
            .toEqual(['bible-1', 'bible-2']);
        expect(ids(filterBookmarksForNavigation(bookmarks, {
            mode: 'relocate',
            destinationBibleLocationRef: '43_3_16_0',
            destinationPreviewText: 'destination'
        }, bibleRefs))).toEqual(['bible-1', 'bible-2']);
    });

    it('offers only normalized Bookmarks for a normalized relocation, regardless of document', () => {
        expect(ids(filterRelocatableNormalizedBookmarks(bookmarks)))
            .toEqual(['word-1', 'word-2', 'other-word', 'other-document', 'other-resource']);
        expect(ids(filterBookmarksForNavigation(bookmarks, {
            mode: 'relocate', normalizedDestination: normalizedTarget,
            destinationPreviewText: 'Selected new word'
        }, bibleRefs))).toEqual(['word-1', 'word-2', 'other-word', 'other-document', 'other-resource']);
    });

    it('filters the exact normalized Resource and word while retaining duplicates', () => {
        expect(ids(filterBookmarksAtNormalizedWord(bookmarks, normalizedTarget)))
            .toEqual(['word-1', 'word-2']);
        expect(ids(filterBookmarksForNavigation(bookmarks, {
            mode: 'browse', normalizedTarget
        }, bibleRefs))).toEqual(['word-1', 'word-2']);
    });

    it('lists all words for one logical document without leaking another publisher or Resource', () => {
        const identity = normalizedTarget.document;
        expect(ids(filterBookmarksForNormalizedDocument(bookmarks, identity)))
            .toEqual(['word-1', 'word-2', 'other-word']);
        expect(ids(filterBookmarksForNavigation(bookmarks, {
            mode: 'browse', normalizedDocument: identity
        }, bibleRefs))).toEqual(['word-1', 'word-2', 'other-word']);
    });

    it('preserves existing Bible and unscoped Browse behavior', () => {
        expect(ids(filterBookmarksForNavigation(bookmarks, {}, bibleRefs)))
            .toEqual(ids(bookmarks));
        expect(ids(filterBookmarksForNavigation(bookmarks, { bibleChapterRef: '43_3' }, bibleRefs)))
            .toEqual(['bible-1']);
        expect(ids(filterBookmarksForNavigation(bookmarks, { bibleLocationRef: '43_4_1_0' }, bibleRefs)))
            .toEqual(['bible-2']);
    });
});

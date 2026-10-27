import { describe, expect, it } from 'vitest';
import { BibleLocationReferenceService } from '$lib/domains/bible';
import type { Bookmark } from '../models/bookmark.model';
import { createChapterBookmarksByLocation, filterBookmarksByBibleChapter, filterBookmarksByBibleScope } from './bookmarks-bible-scope';

const bibleRefs = new BibleLocationReferenceService();
const bookmarks: Bookmark[] = [
    { id: 'a', updatedAt: 123, previewText: '', target: { kind: 'bible', bibleLocationRef: '43_3_16_0' } },
    { id: 'b', updatedAt: 123, previewText: '', target: { kind: 'bible', bibleLocationRef: '43_3_16_0' } },
    { id: 'c', updatedAt: 123, previewText: '', target: { kind: 'bible', bibleLocationRef: '43_4_1_2' } },
    { id: 'd', updatedAt: 123, previewText: '', target: { kind: 'normalized-document', document: { publisher: 'abc', resourceId: 'doc' }, address: { kind: 'word', blockId: 'p1', contentIndex: 0 } } }
];

describe('Bookmarks Bible chapter scope', () => {
    it('keeps all targets in the standalone module', () => {
        expect(filterBookmarksByBibleChapter(bookmarks, undefined, bibleRefs)).toEqual(bookmarks);
    });
    it('includes distinct Bookmarks at the same verse but excludes other chapters and documents', () => {
        expect(filterBookmarksByBibleChapter(bookmarks, '43_3', bibleRefs).map((b) => b.id))
            .toEqual(['a', 'b']);
    });
    it('provides one inline indicator for duplicate Bookmarks at the same word', () => {
        expect(createChapterBookmarksByLocation(bookmarks, '43_3', bibleRefs))
            .toEqual({ '43_3_16_0': true });
    });
    it('filters inline clicks by the exact verse or word, preserving duplicates', () => {
        expect(filterBookmarksByBibleScope(bookmarks, { bibleLocationRef: '43_3_16_0' }, bibleRefs).map((b) => b.id))
            .toEqual(['a', 'b']);
        expect(filterBookmarksByBibleScope(bookmarks, { bibleLocationRef: '43_4_1_2' }, bibleRefs).map((b) => b.id))
            .toEqual(['c']);
    });
});

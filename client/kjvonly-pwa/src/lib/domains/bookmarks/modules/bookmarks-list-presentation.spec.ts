import { describe, expect, it } from 'vitest';
import type { Bookmark } from '../models/bookmark.model';
import { formatBookmarkUpdatedAt, sortBookmarksByUpdatedAt } from './bookmarks-list-presentation';

const bibleTarget = { kind: 'bible' as const, bibleLocationRef: '43_3_16_0' };

function bookmark(id: string, updatedAt: number, target: Bookmark['target'] = bibleTarget): Bookmark {
    return { id, updatedAt, previewText: '', target };
}

describe('Bookmark list presentation', () => {
    it('sorts newest first, then by ID for equal timestamps, without changing the source list', () => {
        const source = [
            bookmark('b', 200),
            bookmark('z', 300),
            bookmark('a', 300),
            bookmark('old', 100)
        ];
        expect(sortBookmarksByUpdatedAt(source).map((item) => item.id)).toEqual([
            'a', 'z', 'b', 'old'
        ]);
        expect(source.map((item) => item.id)).toEqual(['b', 'z', 'a', 'old']);
    });

    it('includes normalized-document bookmarks in the same chronological list', () => {
        const normalized: Bookmark['target'] = {
            kind: 'normalized-document',
            document: { publisher: 'writer', resourceId: 'document' },
            address: { kind: 'word', blockId: 'paragraph-1', contentIndex: 0 }
        };
        expect(sortBookmarksByUpdatedAt([
            bookmark('bible', 100), bookmark('normalized', 200, normalized)
        ]).map((item) => item.id)).toEqual(['normalized', 'bible']);
    });

    it('formats both local date and time, tolerating out-of-range timestamps', () => {
        const label = formatBookmarkUpdatedAt(Date.UTC(2026, 9, 12, 16, 30));
        expect(label).toMatch(/2026/);
        expect(label).toMatch(/\d/);
        expect(label).not.toBe('Invalid Date');
        expect(formatBookmarkUpdatedAt(Number.MAX_SAFE_INTEGER)).toBe('Date unavailable');
    });
});

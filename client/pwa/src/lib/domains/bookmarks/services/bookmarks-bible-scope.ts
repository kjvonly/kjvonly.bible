import type { Bookmark } from '../models/bookmark.model';

interface BibleChapterExtractor {
    extractBookIDChapter(ref: string): string;
}

/**
 * Apply a chapter filter only when explicitly requested. Unscoped Browse lists
 * all accepted Bookmarks; chapter-filtered results exclude normalized documents.
 */
export function filterBookmarksByBibleChapter(
    bookmarks: readonly Bookmark[],
    bibleChapterRef: string | undefined,
    bibleRefs: BibleChapterExtractor
): readonly Bookmark[] {
    if (bibleChapterRef === undefined) {
        return bookmarks;
    }
    return bookmarks.filter((bookmark) => {
        if (bookmark.target.kind !== 'bible') {
            return false;
        }
        try {
            return bibleRefs.extractBookIDChapter(
                bookmark.target.bibleLocationRef
            ) === bibleChapterRef;
        } catch {
            return false;
        }
    });
}

/** Exact-location membership used for inline Bible Reader Bookmark indicators. */
export type ChapterBookmarksByLocation = Record<string, true>;

/** Project all Bookmarks in one chapter, retaining one affordance per exact target. */
export function createChapterBookmarksByLocation(
    bookmarks: readonly Bookmark[],
    chapterRef: string,
    bibleRefs: BibleChapterExtractor
): ChapterBookmarksByLocation {
    const locations: ChapterBookmarksByLocation = {};
    for (const bookmark of filterBookmarksByBibleChapter(bookmarks, chapterRef, bibleRefs)) {
        if (bookmark.target.kind === 'bible') {
            locations[bookmark.target.bibleLocationRef] = true;
        }
    }
    return locations;
}

/** Narrow Bookmarks by an exact token or by a chapter, never both. */
export function filterBookmarksByBibleScope(
    bookmarks: readonly Bookmark[],
    scope: { bibleChapterRef?: string; bibleLocationRef?: string },
    bibleRefs: BibleChapterExtractor
): readonly Bookmark[] {
    if (scope.bibleLocationRef !== undefined) {
        return bookmarks.filter((bookmark) =>
            bookmark.target.kind === 'bible' &&
            bookmark.target.bibleLocationRef === scope.bibleLocationRef
        );
    }
    return filterBookmarksByBibleChapter(bookmarks, scope.bibleChapterRef, bibleRefs);
}

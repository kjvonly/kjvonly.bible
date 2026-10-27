import type { Bookmark, NormalizedDocumentBookmarkTarget, NormalizedBookmarkDocumentReference } from '../models/bookmark.model';
import type { BookmarksNavigationIntent } from '../models/bookmarks-navigation.model';
import { filterBookmarksByBibleScope } from './bookmarks-bible-scope';
import { bookmarkTargetsEqual } from './bookmark-target-validation';

type BibleChapterReferenceExtractor = Parameters<typeof filterBookmarksByBibleScope>[2];

/**
 * Select the Bookmarks visible in one Bookmarks Module navigation context.
 * Relocation can only select existing Bible Bookmarks; normalized-word Browse
 * lists only the exact target; Bible Browse retains its existing scope rules.
 * Sorting remains the responsibility of list presentation, not filtering.
 */
export function filterBookmarksForNavigation(
    bookmarks: readonly Bookmark[],
    intent: BookmarksNavigationIntent,
    bibleRefs: BibleChapterReferenceExtractor
): readonly Bookmark[] {
    if (intent.mode === 'relocate') {
        return intent.normalizedDestination !== undefined
            ? filterRelocatableNormalizedBookmarks(bookmarks)
            : filterRelocatableBibleBookmarks(bookmarks);
    }
    if (intent.normalizedDocument !== undefined) {
        return filterBookmarksForNormalizedDocument(bookmarks, intent.normalizedDocument);
    }
    if (intent.normalizedTarget !== undefined) {
        return filterBookmarksAtNormalizedWord(bookmarks, intent.normalizedTarget);
    }
    return filterBookmarksByBibleScope(bookmarks, {
        bibleChapterRef: intent.bibleChapterRef,
        bibleLocationRef: intent.bibleLocationRef
    }, bibleRefs);
}

/** Keep only Bible Bookmarks eligible for the current Bible relocation flow. */
export function filterRelocatableBibleBookmarks(bookmarks: readonly Bookmark[]): readonly Bookmark[] {
    return bookmarks.filter((bookmark) => bookmark.target.kind === 'bible');
}

/**
 * Match an exact normalized-document Resource and word address.
 * Multiple independent Bookmarks at the same word remain separate entries.
 */
export function filterBookmarksAtNormalizedWord(
    bookmarks: readonly Bookmark[],
    target: NormalizedDocumentBookmarkTarget
): readonly Bookmark[] {
    return bookmarks.filter((bookmark) => bookmarkTargetsEqual(bookmark.target, target));
}

/** Keep only Bookmarks for one publisher-owned Resource, at any word. */
export function filterBookmarksForNormalizedDocument(
    bookmarks: readonly Bookmark[],
    document: NormalizedBookmarkDocumentReference
): readonly Bookmark[] {
    return bookmarks.filter((bookmark) => bookmark.target.kind === 'normalized-document' &&
        bookmark.target.document.publisher === document.publisher &&
        bookmark.target.document.resourceId === document.resourceId);
}

/** Normalized relocation chooses any existing normalized Bookmark, not only this document's. */
export function filterRelocatableNormalizedBookmarks(bookmarks: readonly Bookmark[]): readonly Bookmark[] {
    return bookmarks.filter((bookmark) => bookmark.target.kind === 'normalized-document');
}

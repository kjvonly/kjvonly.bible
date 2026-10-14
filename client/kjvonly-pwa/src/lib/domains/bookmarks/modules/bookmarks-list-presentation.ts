import type { Bookmark } from '../models/bookmark.model';

/** Newest activity first; stable Bookmark IDs settle equal timestamps. */
export function sortBookmarksByUpdatedAt(bookmarks: readonly Bookmark[]): Bookmark[] {
    return [...bookmarks].sort((left, right) =>
        right.updatedAt - left.updatedAt ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
    );
}

/** Display the saved timestamp in the viewer's local date and time. */
export function formatBookmarkUpdatedAt(updatedAt: number): string {
    const date = new Date(updatedAt);
    return Number.isNaN(date.getTime())
        ? 'Date unavailable'
        : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

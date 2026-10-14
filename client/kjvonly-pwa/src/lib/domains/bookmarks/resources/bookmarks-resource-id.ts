import {
	assertBookmarkUuid
} from '../models/bookmark-id';

/** Resource IDs are Bookmark-owned, publisher-independent and location-independent. */
export interface BookmarkResourceIdentity {
	readonly name: 'default';
	readonly bookmarkId: string;
}

/** Generate the replaceable Resource ID for one stable Bookmark. */
export function createBookmarkResourceId(bookmarkId: string): string {
	assertBookmarkUuid(bookmarkId);
	return `kjvonly/bookmarks/bookmark/default/${bookmarkId}`;
}

/** Reject bundles, alternate paths, and non-canonical UUID identifiers. */
export function parseBookmarkResourceId(resourceId: string): BookmarkResourceIdentity {
	const parts = resourceId.split('/');
	if (
		parts.length !== 5 ||
		parts[0] !== 'kjvonly' ||
		parts[1] !== 'bookmarks' ||
		parts[2] !== 'bookmark' ||
		parts[3] !== 'default'
	) {
		throw new Error(`Invalid Bookmark Resource ID: ${resourceId}`);
	}
	const bookmarkId = parts[4];
	assertBookmarkUuid(bookmarkId);
	return { name: 'default', bookmarkId };
}

/** One Bookmark per replaceable Resource; identity is never derived from location. */
export const BOOKMARK_OBJECT_TYPE = 'bookmarks/bookmark';

export interface BookmarkIdParts {
	readonly publisher: string;
	readonly name: 'default';
	readonly bookmarkId: string;
}

/** Canonical lower-case UUIDv4 generated once when a new Bookmark is created. */
const BOOKMARK_UUID_V4 =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Build a Bookmark Domain ID. Relocating its target must never change this ID. */
export function createBookmarkId(
	publisher: string,
	bookmarkId: string
): string {
	assertBookmarkPublisher(publisher);
	assertBookmarkUuid(bookmarkId);
	return `${publisher}/default/${bookmarkId}`;
}

/** Parse the strict, unambiguous Bookmark Domain identity grammar. */
export function parseBookmarkId(id: string): BookmarkIdParts {
	const parts = id.split('/');
	if (parts.length !== 3 || parts[1] !== 'default') {
		throw new Error(`Invalid Bookmark id: ${id}`);
	}

	const [publisher, , bookmarkId] = parts;
	assertBookmarkPublisher(publisher);
	assertBookmarkUuid(bookmarkId);
	return { publisher, name: 'default', bookmarkId };
}

/** Convert a Bookmark Domain ID into the persisted Domain Object key. */
export function createBookmarkDomainObjectId(id: string): string {
	parseBookmarkId(id);
	return `${BOOKMARK_OBJECT_TYPE}:${id}`;
}

/** Local Nostr ownership identity remains independent of the content's publisher. */
export function assertBookmarkPublisher(publisher: string): void {
	if (!publisher || publisher.trim() !== publisher || publisher.includes('/')) {
		throw new Error(`Invalid Bookmark publisher: ${publisher}`);
	}
}

export function assertBookmarkUuid(bookmarkId: string): void {
	if (!BOOKMARK_UUID_V4.test(bookmarkId)) {
		throw new Error(`Invalid Bookmark UUID: ${bookmarkId}`);
	}
}

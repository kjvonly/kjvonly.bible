import { BOOKMARK_OBJECT_TYPE } from '../models/bookmark-id';
import type { BookmarkTarget } from '../models/bookmark.model';

/** One independently identified Bookmark per Resource; no bundles. */
export const BOOKMARKS_RESOURCE_TYPE = BOOKMARK_OBJECT_TYPE;
export const BOOKMARK_DATA_TYPE = 'kjvonly.bookmark';
/** Current semantic Bookmark data contract version. */
export const BOOKMARK_DATA_VERSION = 1;

/** One Bookmark per Resource; identity comes from Resource metadata. */
export interface BookmarkResourceContent {
	readonly target: BookmarkTarget;
	readonly updatedAt: number;
	readonly previewText: string;
}

import type { Bookmark } from '../models/bookmark.model';

/** Accepted Bookmarks live in the shared Domain Object store. */
export interface BookmarksStore {
	get(id: string): Promise<Bookmark | undefined>;
	getAll(): Promise<readonly Bookmark[]>;
	put(bookmark: Bookmark): Promise<void>;
	delete(id: string): Promise<void>;
}

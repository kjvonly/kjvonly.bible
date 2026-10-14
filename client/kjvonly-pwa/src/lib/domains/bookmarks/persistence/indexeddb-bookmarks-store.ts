import {
	DOMAIN_OBJECTS,
	OBJECT_TYPE_INDEX,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

import { BOOKMARK_OBJECT_TYPE } from '../models/bookmark-id';
import type { Bookmark } from '../models/bookmark.model';
import { BOOKMARK_DATA_TYPE, BOOKMARK_DATA_VERSION } from '../resources/bookmarks-resource-contract';
import type { BookmarksStore } from './bookmarks-store';

/** Persist accepted Bookmarks without introducing a new IndexedDB object store. */
export class IndexedDBBookmarksStore implements BookmarksStore {
	constructor(private readonly getDB: () => Promise<ApplicationDB>) {}

	async get(id: string): Promise<Bookmark | undefined> {
		const db = await this.getDB();
		const stored = await db.get(DOMAIN_OBJECTS, createStoredDomainObjectId(BOOKMARK_OBJECT_TYPE, id));
		return stored?.value as Bookmark | undefined;
	}

	async getAll(): Promise<readonly Bookmark[]> {
		const db = await this.getDB();
		const stored = await db.getAllFromIndex(DOMAIN_OBJECTS, OBJECT_TYPE_INDEX, BOOKMARK_OBJECT_TYPE);
		return stored.map((item) => item.value as Bookmark);
	}

	async put(bookmark: Bookmark): Promise<void> {
		const db = await this.getDB();
		const stored: StoredDomainObject = {
			id: createStoredDomainObjectId(BOOKMARK_OBJECT_TYPE, bookmark.id),
			objectType: BOOKMARK_OBJECT_TYPE,
			objectId: bookmark.id,
			dataType: BOOKMARK_DATA_TYPE,
			dataVersion: BOOKMARK_DATA_VERSION,
			value: bookmark
		};
		await db.put(DOMAIN_OBJECTS, stored);
	}

	async delete(id: string): Promise<void> {
		const db = await this.getDB();
		await db.delete(DOMAIN_OBJECTS, createStoredDomainObjectId(BOOKMARK_OBJECT_TYPE, id));
	}
}

import { describe, expect, it, vi } from 'vitest';
import {
	DOMAIN_OBJECTS, OBJECT_TYPE_INDEX, createStoredDomainObjectId,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';
import { BOOKMARK_OBJECT_TYPE } from '../models/bookmark-id';
import type { Bookmark } from '../models/bookmark.model';
import { BOOKMARK_DATA_TYPE, BOOKMARK_DATA_VERSION } from '../resources/bookmarks-resource-contract';
import { IndexedDBBookmarksStore } from './indexeddb-bookmarks-store';

const ID = 'publisher/default/91673f6e-8c12-489b-9120-faf96cdf0ba7';
const bookmark: Bookmark = { id: ID, target: { kind: 'bible', bibleLocationRef: '43_3_16_0' },
	updatedAt: 1791840000000, previewText: 'For God so loved the world.' };
const storedId = createStoredDomainObjectId(BOOKMARK_OBJECT_TYPE, ID);
const envelope = {
	id: storedId,
	objectType: BOOKMARK_OBJECT_TYPE,
	objectId: ID,
	dataType: BOOKMARK_DATA_TYPE,
	dataVersion: BOOKMARK_DATA_VERSION,
	value: bookmark
};

function makeStore(db: Partial<ApplicationDB>): IndexedDBBookmarksStore {
	return new IndexedDBBookmarksStore(async () => db as ApplicationDB);
}

describe('IndexedDBBookmarksStore', () => {
	it('loads one Bookmark using the shared Domain Object key', async () => {
		const get = vi.fn().mockResolvedValue(envelope);
		await expect(makeStore({ get }).get(ID)).resolves.toEqual(bookmark);
		expect(get).toHaveBeenCalledWith(DOMAIN_OBJECTS, storedId);
	});

	it('returns undefined when a Bookmark is missing', async () => {
		await expect(makeStore({ get: vi.fn().mockResolvedValue(undefined) }).get(ID))
			.resolves.toBeUndefined();
	});

	it('lists only Bookmark Domain Objects via the objectType index', async () => {
		const getAllFromIndex = vi.fn().mockResolvedValue([envelope]);
		await expect(makeStore({ getAllFromIndex }).getAll()).resolves.toEqual([bookmark]);
		expect(getAllFromIndex).toHaveBeenCalledWith(DOMAIN_OBJECTS, OBJECT_TYPE_INDEX, BOOKMARK_OBJECT_TYPE);
	});

	it('puts the versioned Domain Object envelope', async () => {
		const put = vi.fn().mockResolvedValue(undefined);
		await makeStore({ put }).put(bookmark);
		expect(put).toHaveBeenCalledWith(DOMAIN_OBJECTS, envelope);
	});

	it('deletes by Bookmark identity, not by its location', async () => {
		const deleteValue = vi.fn().mockResolvedValue(undefined);
		await makeStore({ delete: deleteValue }).delete(ID);
		expect(deleteValue).toHaveBeenCalledWith(DOMAIN_OBJECTS, storedId);
	});
});

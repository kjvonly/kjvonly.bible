import { describe, expect, it } from 'vitest';
import type { ResourcePublication } from '$lib/resource';
import {
	DOMAIN_OBJECTS, RESOURCE_INSTALLATIONS, OUTBOX,
	createStoredDomainObjectId, type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';
import type { Bookmark } from '../models/bookmark.model';
import { BOOKMARK_OBJECT_TYPE } from '../models/bookmark-id';
import { BOOKMARK_DATA_TYPE, BOOKMARK_DATA_VERSION } from '../resources/bookmarks-resource-contract';
import { BookmarksResourcePublication } from '../resources/bookmarks-resource-publication';
import { IndexedDBBookmarksWriteTransaction } from './bookmarks-write-transaction';

const bookmark: Bookmark = {
	id: 'publisher/default/91673f6e-8c12-489b-9120-faf96cdf0ba7',
	target: { kind: 'bible', bibleLocationRef: '43_3_16_0' },
	updatedAt: 1791840000000,
	previewText: 'For God so loved the world.'
};
const storedId = createStoredDomainObjectId(BOOKMARK_OBJECT_TYPE, bookmark.id);
const publications = new BookmarksResourcePublication();

/** Transaction-shaped fake that stages writes until commit and discards on abort. */
class FakeApplicationDB {
	storeNames: string[] = [];
	mode: IDBTransactionMode | undefined;
	abortCount = 0;
	private readonly committed = new Map<string, Map<string, unknown>>();
	constructor(private readonly failingStore?: string, private readonly error?: Error) {}

	asApplicationDB(): ApplicationDB {
		return { transaction: (names: string[], mode: IDBTransactionMode) => {
			this.storeNames = [...names];
			this.mode = mode;
			const pending = new Map<string, Map<string, unknown>>();
			for (const name of names) pending.set(name, new Map(this.committed.get(name) ?? []));
			let aborted = false;
			const commit = (name: string, values: Map<string, unknown>) => {
				this.committed.set(name, values);
			};
			return {
				objectStore: (name: string) => ({
					get: async (id: string) => pending.get(name)?.get(id),
					put: async (value: { id: string }) => {
						if (name === this.failingStore) throw this.error;
						pending.get(name)?.set(value.id, value);
					},
					delete: async (id: string) => { pending.get(name)?.delete(id); }
				}),
				abort: () => { aborted = true; this.abortCount += 1; },
				get done() {
					if (aborted) return Promise.reject(new Error('aborted'));
					for (const [name, values] of pending) {
						commit(name, values);
					}
					return Promise.resolve();
				}
			};
		} } as unknown as ApplicationDB;
	}

	get<T = unknown>(name: string, key = storedId): T | undefined {
		return this.committed.get(name)?.get(key) as T | undefined;
	}
}

function expectedEnvelope(value: Bookmark) {
	return {
		id: storedId, objectType: BOOKMARK_OBJECT_TYPE, objectId: bookmark.id,
		dataType: BOOKMARK_DATA_TYPE, dataVersion: BOOKMARK_DATA_VERSION, value
	};
}

describe('IndexedDBBookmarksWriteTransaction', () => {
	it('opens the three required object stores in one readwrite transaction', async () => {
		const db = new FakeApplicationDB();
		await new IndexedDBBookmarksWriteTransaction(async () => db.asApplicationDB()).run(async () => {});
		expect(db.storeNames).toEqual([DOMAIN_OBJECTS, RESOURCE_INSTALLATIONS, OUTBOX]);
		expect(db.mode).toBe('readwrite');
	});

	it('atomically saves the Bookmark, installation and pending publication', async () => {
		const db = new FakeApplicationDB();
		const tx = new IndexedDBBookmarksWriteTransaction(async () => db.asApplicationDB(), () => 100);
		const resource = publications.create(bookmark);
		await tx.run(async (stores) => {
			await stores.bookmarks.put(bookmark);
			await stores.outbox.put(bookmark.id, resource);
		});
		expect(db.get(DOMAIN_OBJECTS)).toEqual(expectedEnvelope(bookmark));
		expect(db.get(RESOURCE_INSTALLATIONS)).toEqual({
			id: storedId, objectType: BOOKMARK_OBJECT_TYPE, objectId: bookmark.id,
			publisher: 'publisher', modifiedAt: 100
		});
		expect(db.get(OUTBOX)).toEqual({
			id: storedId, publication: { ...resource, modifiedAt: 100 }, status: 'pending', attempts: 0
		});
	});

	it('relocates an existing Bookmark without changing its publication key', async () => {
		const db = new FakeApplicationDB();
		const tx = new IndexedDBBookmarksWriteTransaction(async () => db.asApplicationDB(), () => 100);
		await tx.run(async (stores) => {
			await stores.bookmarks.put(bookmark);
			await stores.outbox.put(bookmark.id, publications.create(bookmark));
		});
		const moved: Bookmark = { ...bookmark, target: { kind: 'bible', bibleLocationRef: '43_3_17_8' } };
		await tx.run(async (stores) => {
			await stores.bookmarks.put(moved);
			await stores.outbox.put(moved.id, publications.create(moved));
		});
		expect(db.get(DOMAIN_OBJECTS)).toEqual(expectedEnvelope(moved));
		expect(db.get<{ modifiedAt: number }>(RESOURCE_INSTALLATIONS)?.modifiedAt).toBe(101);
		expect(db.get<{ publication: { modifiedAt: number } }>(OUTBOX)?.publication.modifiedAt).toBe(101);
	});

	it('deletes one Bookmark while preserving a replacement Resource deletion in Outbox', async () => {
		const db = new FakeApplicationDB();
		const tx = new IndexedDBBookmarksWriteTransaction(async () => db.asApplicationDB(), () => 100);
		await tx.run(async (stores) => {
			await stores.bookmarks.put(bookmark);
			await stores.outbox.put(bookmark.id, publications.create(bookmark));
		});
		const deletion = publications.createDeletion(bookmark.id);
		await tx.run(async (stores) => {
			await stores.bookmarks.delete(bookmark.id);
			await stores.outbox.put(bookmark.id, deletion);
		});
		expect(db.get(DOMAIN_OBJECTS)).toBeUndefined();
		expect(db.get(RESOURCE_INSTALLATIONS)).toBeUndefined();
		expect(db.get(OUTBOX)).toEqual({
			id: storedId, publication: { ...deletion, modifiedAt: 101 }, status: 'pending', attempts: 0
		});
		await tx.run(async (stores) => {
			await stores.bookmarks.put(bookmark);
			await stores.outbox.put(bookmark.id, publications.create(bookmark));
		});
		expect(db.get<{ publication: { modifiedAt: number } }>(OUTBOX)?.publication.modifiedAt).toBe(102);
	});

	it('keeps independent IDs when two Bookmarks share the same exact word', async () => {
		const db = new FakeApplicationDB();
		const tx = new IndexedDBBookmarksWriteTransaction(async () => db.asApplicationDB(), () => 100);
		const duplicate: Bookmark = {
			id: 'publisher/default/c4b1079e-a7fa-4f89-ac9b-644f92ef66c5',
			target: bookmark.target,
			updatedAt: bookmark.updatedAt, previewText: bookmark.previewText
		};
		await tx.run(async (stores) => {
			await stores.bookmarks.put(bookmark);
			await stores.outbox.put(bookmark.id, publications.create(bookmark));
			await stores.bookmarks.put(duplicate);
			await stores.outbox.put(duplicate.id, publications.create(duplicate));
		});
		const otherId = createStoredDomainObjectId(BOOKMARK_OBJECT_TYPE, duplicate.id);
		expect(db.get<{ id: string }>(DOMAIN_OBJECTS)?.id).toBe(storedId);
		expect(db.get<{ value: Bookmark }>(DOMAIN_OBJECTS, otherId)?.value).toEqual(duplicate);
		expect(db.get(OUTBOX, otherId) !== undefined).toBe(true);
	});

	it('persists the exact publisher-owned normalized-document target', async () => {
		const db = new FakeApplicationDB();
		const tx = new IndexedDBBookmarksWriteTransaction(async () => db.asApplicationDB(), () => 100);
		const normalized: Bookmark = {
			...bookmark,
			target: {
				kind: 'normalized-document',
				document: { publisher: 'author', resourceId: 'kjvonly/normalized-content/doc/chapter-1' },
				address: { kind: 'word', blockId: 'paragraph-3', contentIndex: 7 }
			}
		};
		await tx.run(async (stores) => {
			await stores.bookmarks.put(normalized);
			await stores.outbox.put(normalized.id, publications.create(normalized));
		});
		expect(db.get<{ value: Bookmark }>(DOMAIN_OBJECTS)?.value).toEqual(normalized);
		expect(db.get<{ publication: ResourcePublication }>(OUTBOX)?.publication.value).toEqual({
			target: normalized.target,
			updatedAt: normalized.updatedAt,
			previewText: normalized.previewText
		});
	});

	it('aborts when the publication cannot be queued, preserving previous accepted state', async () => {
		const error = new Error('outbox unavailable');
		const db = new FakeApplicationDB(OUTBOX, error);
		const tx = new IndexedDBBookmarksWriteTransaction(async () => db.asApplicationDB());
		await expect(tx.run(async (stores) => {
			await stores.bookmarks.put(bookmark);
			await stores.outbox.put(bookmark.id, publications.create(bookmark));
		})).rejects.toBe(error);
		expect(db.abortCount).toBe(1);
		expect(db.get(DOMAIN_OBJECTS)).toBeUndefined();
		expect(db.get(RESOURCE_INSTALLATIONS)).toBeUndefined();
		expect(db.get(OUTBOX)).toBeUndefined();
	});
});

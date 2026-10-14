import { createPendingPublication } from '$lib/application';
import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	OUTBOX,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';
import { isResourceDeletionPublication } from '$lib/resource';

import { BOOKMARK_OBJECT_TYPE } from '../models/bookmark-id';
import { BOOKMARK_DATA_TYPE, BOOKMARK_DATA_VERSION } from '../resources/bookmarks-resource-contract';
import type { BookmarksWriteStores, BookmarksWriteTransaction } from '../resources/bookmarks-write-stores';

/** Atomic, local-first Bookmark save/delete and last-write-wins publication. */
export class IndexedDBBookmarksWriteTransaction implements BookmarksWriteTransaction {
	constructor(
		private readonly getDB: () => Promise<ApplicationDB>,
		private readonly nowEpochSeconds: () => number = () => Math.floor(Date.now() / 1000)
	) {}

	async run<TResult>(operation: (stores: BookmarksWriteStores) => Promise<TResult>): Promise<TResult> {
		const db = await this.getDB();
		const transaction = db.transaction([DOMAIN_OBJECTS, RESOURCE_INSTALLATIONS, OUTBOX], 'readwrite');
		const domainObjects = transaction.objectStore(DOMAIN_OBJECTS);
		const resourceInstallations = transaction.objectStore(RESOURCE_INSTALLATIONS);
		const outbox = transaction.objectStore(OUTBOX);

		const stores: BookmarksWriteStores = {
			bookmarks: {
				put: async (bookmark) => {
					const stored: StoredDomainObject = {
						id: createStoredDomainObjectId(BOOKMARK_OBJECT_TYPE, bookmark.id),
						objectType: BOOKMARK_OBJECT_TYPE,
						objectId: bookmark.id,
						dataType: BOOKMARK_DATA_TYPE,
						dataVersion: BOOKMARK_DATA_VERSION,
						value: bookmark
					};
					await domainObjects.put(stored);
				},
				delete: async (id) => {
					await domainObjects.delete(createStoredDomainObjectId(BOOKMARK_OBJECT_TYPE, id));
				}
			},
			outbox: {
				put: async (bookmarkId, resource) => {
					const storedId = createStoredDomainObjectId(BOOKMARK_OBJECT_TYPE, bookmarkId);
					const existingInstallation = await resourceInstallations.get(storedId);
					const existingOutbox = await outbox.get(storedId);
					// Deletions remove the installation record. Preserve monotonic revision
					// order on an immediate recreation by also considering the Outbox.
					const outboxModifiedAt = existingOutbox?.publication.modifiedAt;
					const lastOutboxRevision = typeof outboxModifiedAt === 'number' ? outboxModifiedAt : 0;
					const modifiedAt = Math.max(
						this.nowEpochSeconds(),
						(existingInstallation?.modifiedAt ?? 0) + 1,
						lastOutboxRevision + 1
					);

					if (isResourceDeletionPublication(resource)) {
						await resourceInstallations.delete(storedId);
					} else {
						await resourceInstallations.put({
							id: storedId,
							objectType: BOOKMARK_OBJECT_TYPE,
							objectId: bookmarkId,
							publisher: resource.publisher,
							modifiedAt
						});
					}

					await outbox.put(createPendingPublication(storedId, { ...resource, modifiedAt }));
				}
			}
		};

		try {
			const result = await operation(stores);
			await transaction.done;
			return result;
		} catch (error) {
			try {
				transaction.abort();
			} catch {
				// A failed transaction may already be inactive.
			}
			try {
				await transaction.done;
			} catch {
				// Retain the original write failure.
			}
			throw error;
		}
	}
}

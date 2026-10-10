import {
	NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE
} from '../models/normalized-content-text-markup.model';

import {
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,
	NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION
} from '../resources/text-markup/normalized-content-text-markup-resource';

import type {
	NormalizedContentTextMarkupWriteStores,
	NormalizedContentTextMarkupWriteTransaction
} from '../resources/text-markup/normalized-content-text-markup-write-stores';

import {
	createPendingPublication
} from '$lib/application';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	OUTBOX,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

/**
 * Persists one Text Markup edit and its pending Resource publication as one
 * IndexedDB transaction.
 */
export class IndexedDBNormalizedContentTextMarkupWriteTransaction
	implements NormalizedContentTextMarkupWriteTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>,

		private readonly nowEpochSeconds:
			() => number =
				() => Math.floor(
					Date.now() / 1000
				)
	) {}

	/**
	 * Executes one atomic local save across Domain Objects, Resource
	 * installations, and Outbox. A rejected operation aborts the transaction.
	 *
	 * @param operation Writes to the transaction-scoped Text Markup/Outbox stores.
	 * @returns The operation result after the IndexedDB commit completes.
	 */
	async run<TResult>(
		operation:
			(
				stores:
					NormalizedContentTextMarkupWriteStores
			) => Promise<TResult>
	): Promise<TResult> {
		const db =
			await this.getDB();

		const transaction =
			db.transaction(
				[
					DOMAIN_OBJECTS,
					RESOURCE_INSTALLATIONS,
					OUTBOX
				],
				'readwrite'
			);

		const domainObjects =
			transaction.objectStore(
				DOMAIN_OBJECTS
			);

		const resourceInstallations =
			transaction.objectStore(
				RESOURCE_INSTALLATIONS
			);

		const outbox =
			transaction.objectStore(
				OUTBOX
			);

		const stores:
			NormalizedContentTextMarkupWriteStores = {
				textMarkup: {
					put:
						async (
							textMarkup
						) => {
							const stored:
								StoredDomainObject = {
									id:
										createStoredDomainObjectId(
											NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
											textMarkup.id
										),

									objectType:
										NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,

									dataType:
										NORMALIZED_CONTENT_TEXT_MARKUP_DATA_TYPE,

									dataVersion:
										NORMALIZED_CONTENT_TEXT_MARKUP_DATA_VERSION,

									objectId:
										textMarkup.id,

									value:
										textMarkup
								};

							await domainObjects.put(
								stored
							);
						}
				},

				outbox: {
					put:
						async (
							objectId,
							resource
						) => {
							const storedId =
								createStoredDomainObjectId(
									NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
									objectId
								);

							const existing =
								await resourceInstallations.get(
									storedId
								);

							const modifiedAt =
								Math.max(
									this.nowEpochSeconds(),
									(existing?.modifiedAt ?? 0) + 1
								);

							await resourceInstallations.put({
								id:
									storedId,
								objectType:
									NORMALIZED_CONTENT_TEXT_MARKUP_OBJECT_TYPE,
								objectId,
								publisher:
									resource.publisher,
								modifiedAt
							});

							await outbox.put(
								createPendingPublication(
									storedId,
									{
										...resource,
										modifiedAt
									}
								)
							);
						}
				}
			};

		try {
			const result =
				await operation(
					stores
				);

			await transaction.done;

			return result;
		} catch (error) {
			try {
				transaction.abort();
			} catch {
				// Transaction may already be inactive.
			}

			try {
				await transaction.done;
			} catch {
				// Preserve the original operation error.
			}

			throw error;
		}
	}
}

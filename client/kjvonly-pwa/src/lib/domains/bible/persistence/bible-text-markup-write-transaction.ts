import type {
	BibleTextMarkup
} from '$lib/domains/bible/models/bible-text-markup.model';

import {
	BIBLE_TEXT_MARKUP_OBJECT_TYPE
} from './bible-text-markup-store';

import type {
	BibleTextMarkupWriteStores,
	BibleTextMarkupWriteTransaction
} from '$lib/domains/bible/resources/text-markup/bible-text-markup-write-stores';

import {
	createPendingResourcePublication
} from '$lib/resource/outbox/outbox-entry';

import {
	DOMAIN_OBJECTS,
	OUTBOX,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBBibleTextMarkupWriteTransaction
	implements BibleTextMarkupWriteTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					BibleTextMarkupWriteStores
			) => Promise<TResult>
	): Promise<TResult> {
		const db =
			await this.getDB();

		const transaction =
			db.transaction(
				[
					DOMAIN_OBJECTS,
					OUTBOX
				],
				'readwrite'
			);

		const domainObjects =
			transaction.objectStore(
				DOMAIN_OBJECTS
			);

		const outbox =
			transaction.objectStore(
				OUTBOX
			);

		const stores:
			BibleTextMarkupWriteStores = {
				textMarkup: {
					put:
						async (
							textMarkup
						) => {
							const stored:
								StoredDomainObject = {
									id:
										createStoredDomainObjectId(
											BIBLE_TEXT_MARKUP_OBJECT_TYPE,
											textMarkup.id
										),

									objectType:
										BIBLE_TEXT_MARKUP_OBJECT_TYPE,

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
									BIBLE_TEXT_MARKUP_OBJECT_TYPE,
									objectId
								);

							await outbox.put(
								createPendingResourcePublication(
									storedId,
									resource
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

import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleTextMarkup
} from '$lib/domains/bible/models/bible-text-markup.model';

import {
	BIBLE_TEXT_MARKUP_OBJECT_TYPE
} from './bible-text-markup-store';

import {
	DOMAIN_OBJECTS,
	OUTBOX,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	IndexedDBBibleTextMarkupWriteTransaction
} from './bible-text-markup-write-transaction';

describe(
	'IndexedDBBibleTextMarkupWriteTransaction',
	() => {
		it(
			'opens one readwrite transaction over Domain Objects and Outbox',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBibleTextMarkupWriteTransaction(
						async () =>
							db.asApplicationDB()
					);

				await transaction.run(
					async () => {}
				);

				expect(
					db.storeNames
				).toEqual([
					DOMAIN_OBJECTS,
					OUTBOX
				]);

				expect(
					db.mode
				).toBe(
					'readwrite'
				);
			}
		);

		it(
			'persists accepted Text Markup and its Resource publication in the same transaction with the same id',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBibleTextMarkupWriteTransaction(
						async () =>
							db.asApplicationDB()
					);

				const textMarkup =
					createTextMarkup();

				const publication =
					createPublication();

				await transaction.run(
					async (
						stores
					) => {
						await stores
							.textMarkup
							.put(
								textMarkup
							);

						await stores
							.outbox
							.put(
								textMarkup.id,
								publication
							);
					}
				);

				const storedId =
					`${BIBLE_TEXT_MARKUP_OBJECT_TYPE}:${textMarkup.id}`;

				expect(
					db.getStoredValue(
						DOMAIN_OBJECTS,
						storedId
					)
				).toEqual({
					id:
						storedId,

					objectType:
						BIBLE_TEXT_MARKUP_OBJECT_TYPE,

					objectId:
						textMarkup.id,

					value:
						textMarkup
				});

				expect(
					db.getStoredValue(
						OUTBOX,
						storedId
					)
				).toEqual({
					id:
						storedId,

					resource:
						publication,

					status:
						'pending',

					attempts:
						0
				});
			}
		);

		it(
			'aborts the shared transaction when the write operation fails',
			async () => {
				const error =
					new Error(
						'write failed'
					);

				const db =
					new FakeApplicationDB(
						OUTBOX,
						error
					);

				const transaction =
					new IndexedDBBibleTextMarkupWriteTransaction(
						async () =>
							db.asApplicationDB()
					);

				await expect(
					transaction.run(
						async (
							stores
						) => {
							const textMarkup =
								createTextMarkup();

							await stores
								.textMarkup
								.put(
									textMarkup
								);

							await stores
								.outbox
								.put(
									textMarkup.id,
									createPublication()
								);
						}
					)
				).rejects.toBe(
					error
				);

				expect(
					db.transactionAbortCount
				).toBe(
					1
				);
			}
		);
	}
);

function createTextMarkup():
	BibleTextMarkup {
	return {
		id:
			'publisher/kjvs/1_1',

		chapterRef:
			'1_1',

		markings: {
			'1': {
				'0': {
					class: [
						'bg-highlighta'
					]
				}
			}
		}
	};
}

function createPublication() {
	return {
		publisher:
			'publisher',

		resourceType:
			'kjvonly/overlays/text-markup',

		resourceId:
			'kjvonly/overlays/text-markup/kjvs/1_1',

		value:
			createTextMarkup().markings
	};
}

class FakeApplicationDB {
	storeNames:
		readonly string[] =
			[];

	mode:
		IDBTransactionMode |
		undefined;

	transactionAbortCount =
		0;

	private readonly stores =
		new Map<
			string,
			Map<string, unknown>
		>();

	constructor(
		private readonly failingStore?:
			string,

		private readonly putError?:
			Error
	) {}

	asApplicationDB():
		ApplicationDB {
		return {
			transaction:
				(
					storeNames:
						readonly string[],

					mode:
						IDBTransactionMode
				) => {
					this.storeNames = [
						...storeNames
					];

					this.mode =
						mode;

					return this.createTransaction();
				}
		} as unknown as ApplicationDB;
	}

	getStoredValue(
		storeName: string,
		id: string
	): unknown {
		return this.stores
			.get(
				storeName
			)
			?.get(
				id
			);
	}

	private createTransaction() {
		let aborted =
			false;

		const done =
			Promise.resolve();

		return {
			objectStore:
				(
					storeName: string
				) =>
					this.createObjectStore(
						storeName
					),

			abort:
				() => {
					aborted =
						true;

					this.transactionAbortCount +=
						1;
				},

			get done() {
				if (aborted) {
					return Promise.reject(
						new Error(
							'aborted'
						)
					);
				}

				return done;
			}
		};
	}

	private createObjectStore(
		storeName: string
	) {
		let store =
			this.stores.get(
				storeName
			);

		if (!store) {
			store =
				new Map<
					string,
					unknown
				>();

			this.stores.set(
				storeName,
				store
			);
		}

		return {
			put:
				async (
					value: {
						id: string;
					}
				) => {
					if (
						storeName ===
							this.failingStore
					) {
						throw this.putError;
					}

					store?.set(
						value.id,
						value
					);
				}
		};
	}
}

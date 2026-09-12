import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	Note
} from '$lib/domains/notes/models/note.model';

import {
	NOTE_OBJECT_TYPE
} from './notes-store';

import {
	DOMAIN_OBJECTS,
	OUTBOX,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	IndexedDBNotesWriteTransaction
} from './notes-write-transaction';

import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

describe(
	'IndexedDBNotesWriteTransaction',
	() => {
		it(
			'opens one readwrite transaction over Domain Objects and Outbox',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBNotesWriteTransaction(
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
			'persists the Note and Resource publication with the same Domain Object key',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBNotesWriteTransaction(
						async () =>
							db.asApplicationDB()
					);

				const note =
					createNote();

				const publication =
					createPublication();

				await transaction.run(
					async (
						stores
					) => {
						await stores.notes.put(
							note
						);

						await stores.outbox.put(
							note.id,
							publication
						);
					}
				);

				const storedId =
					`${NOTE_OBJECT_TYPE}:${note.id}`;

				expect(
					db.getStoredValue(
						DOMAIN_OBJECTS,
						storedId
					)
				).toEqual({
					id:
						storedId,
					objectType:
						NOTE_OBJECT_TYPE,
					objectId:
						note.id,
					value:
						note
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
					new IndexedDBNotesWriteTransaction(
						async () =>
							db.asApplicationDB()
					);

				await expect(
					transaction.run(
						async (
							stores
						) => {
							const note =
								createNote();

							await stores.notes.put(
								note
							);

							await stores.outbox.put(
								note.id,
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

function createNote(): Note {
	return {
		id:
			'publisher/default/note-1',
		bibleLocationRef:
			undefined,
		bibleReferenceText:
			undefined,
		title:
			'Title',
		text:
			'Text',
		html:
			'<p>Text</p>',
		dateCreated:
			1,
		dateUpdated:
			2,
		tags:
			[]
	};
}

function createPublication():
	ResourcePublication {
	return {
		publisher:
			'publisher',
		resourceType:
			'kjvonly/notes/entries',
		resourceId:
			'kjvonly/notes/entries/default/note-1',
		representation:
			'content',
		mediaType:
			'application/json+gzip+hex',
		value: {
			title:
				'Title'
		}
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

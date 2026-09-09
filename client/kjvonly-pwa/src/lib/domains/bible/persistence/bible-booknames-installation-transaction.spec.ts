import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleBooknames
} from '$lib/domains/bible/models/bible-booknames.model';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import {
	BIBLE_BOOKNAMES_OBJECT_TYPE
} from './bible-booknames-store';

import {
	IndexedDBBibleBooknamesInstallationTransaction
} from './bible-booknames-installation-transaction';

describe(
	'IndexedDBBibleBooknamesInstallationTransaction',
	() => {
		it(
			'opens a readwrite transaction over the required object stores',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBibleBooknamesInstallationTransaction(
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
					RESOURCE_INSTALLATIONS
				]);

				expect(
					db.mode
				).toBe(
					'readwrite'
				);
			}
		);

		it(
			'exposes a transaction-scoped BibleBooknamesStore',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBibleBooknamesInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				const booknames =
					createBooknames();

				await transaction.run(
					async (
						stores
					) => {
						await stores.booknames.put(
							booknames
						);

						expect(
							await stores.booknames.get(
								booknames.id
							)
						).toEqual(
							booknames
						);
					}
				);

				expect(
					db.getStoredValue(
						DOMAIN_OBJECTS,
						`${BIBLE_BOOKNAMES_OBJECT_TYPE}:${booknames.id}`
					)
				).toEqual({
					id:
						`${BIBLE_BOOKNAMES_OBJECT_TYPE}:${booknames.id}`,

					objectType:
						BIBLE_BOOKNAMES_OBJECT_TYPE,

					objectId:
						booknames.id,

					value:
						booknames
				});
			}
		);

		it(
			'returns undefined for missing Bible Booknames',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBibleBooknamesInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				await transaction.run(
					async (
						stores
					) => {
						expect(
							await stores.booknames.get(
								'publisher/default'
							)
						).toBeUndefined();
					}
				);
			}
		);

		it(
			'exposes a transaction-scoped ResourceInstallationStore',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBibleBooknamesInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				const objectId =
					'publisher/default';

				const installation:
					ResourceInstallation = {
						id:
							createResourceInstallationId(
								BIBLE_BOOKNAMES_OBJECT_TYPE,
								objectId
							),

						objectType:
							BIBLE_BOOKNAMES_OBJECT_TYPE,

						objectId,

						publisher:
							'publisher',

						resourceId:
							'kjvonly/bible/booknames/default',

						modifiedAt:
							123
					};

				await transaction.run(
					async (
						stores
					) => {
						await stores
							.resourceInstallations
							.put(
								installation
							);

						expect(
							await stores
								.resourceInstallations
								.get(
									BIBLE_BOOKNAMES_OBJECT_TYPE,
									objectId
								)
						).toEqual(
							installation
						);
					}
				);

				expect(
					db.getStoredValue(
						RESOURCE_INSTALLATIONS,
						installation.id
					)
				).toEqual(
					installation
				);
			}
		);

		it(
			'returns the installation operation result',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBibleBooknamesInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				const result =
					await transaction.run(
						async () =>
							'installation-complete'
					);

				expect(
					result
				).toBe(
					'installation-complete'
				);
			}
		);

		it(
			'aborts the transaction and preserves the operation error',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBibleBooknamesInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				const error =
					new Error(
						'installation failed'
					);

				await expect(
					transaction.run(
						async () => {
							throw error;
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

function createBooknames():
	BibleBooknames {
	return {
		id:
			'publisher/default',

		booknamesById: {
			'1':
				'Genesis'
		},

		booknamesByName: {
			Genesis:
				1
		},

		shortNames: {
			'1':
				'Gen'
		},

		maxChapterById: {
			'1':
				1
		},

		bookchapterversecountById: {
			'1': {
				'1':
					31
			}
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
		return {
			objectStore:
				(
					storeName:
						string
				) =>
					this.createObjectStore(
						storeName
					),

			done:
				Promise.resolve(),

			abort:
				() => {
					this.transactionAbortCount++;
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
			get:
				async (
					id:
						string
				) =>
					store.get(
						id
					),

			put:
				async (
					value:
						unknown
				) => {
					const id =
						(
							value as {
								id: string;
							}
						).id;

					store.set(
						id,
						value
					);
				}
		};
	}
}

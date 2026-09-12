import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleSearchIndex
} from '$lib/domains/bible/models/bible-search-index.model';

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
	BIBLE_SEARCH_INDEX_OBJECT_TYPE
} from './bible-search-index-store';

import {
	IndexedDBBibleSearchIndexInstallationTransaction
} from './bible-search-index-installation-transaction';

describe(
	'IndexedDBBibleSearchIndexInstallationTransaction',
	() => {
		it(
			'opens a readwrite transaction over Domain Objects and Resource Installations',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBibleSearchIndexInstallationTransaction(
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
			'exposes a transaction-scoped BibleSearchIndexStore',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBibleSearchIndexInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				const searchIndex =
					createSearchIndex();

				await transaction.run(
					async (stores) => {
						await stores.searchIndexes.put(
							searchIndex
						);

						expect(
							await stores.searchIndexes.get(
								searchIndex.id
							)
						).toEqual(
							searchIndex
						);
					}
				);

				expect(
					db.getStoredValue(
						DOMAIN_OBJECTS,
						`${BIBLE_SEARCH_INDEX_OBJECT_TYPE}:${searchIndex.id}`
					)
				).toEqual({
					id:
						`${BIBLE_SEARCH_INDEX_OBJECT_TYPE}:${searchIndex.id}`,

					objectType:
						BIBLE_SEARCH_INDEX_OBJECT_TYPE,

					objectId:
						searchIndex.id,

					value:
						searchIndex
				});
			}
		);

		it(
			'exposes a transaction-scoped ResourceInstallationStore',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBibleSearchIndexInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				const installation =
					createInstallation();

				await transaction.run(
					async (stores) => {
						await stores
							.resourceInstallations
							.put(
								installation
							);

						expect(
							await stores
								.resourceInstallations
								.get(
									BIBLE_SEARCH_INDEX_OBJECT_TYPE,
									'publisher/kjvs'
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
					new IndexedDBBibleSearchIndexInstallationTransaction(
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
					new IndexedDBBibleSearchIndexInstallationTransaction(
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

function createSearchIndex():
	BibleSearchIndex {
	return {
		id:
			'publisher/kjvs',

		version:
			'kjvs',

		chunks: {
			reg:
				'{}',

			cfg:
				'{"doc":0,"opt":1}',

			map:
				'[]',

			ctx:
				'[]'
		}
	};
}

function createInstallation():
	ResourceInstallation {
	return {
		id:
			createResourceInstallationId(
				BIBLE_SEARCH_INDEX_OBJECT_TYPE,
				'publisher/kjvs'
			),

		objectType:
			BIBLE_SEARCH_INDEX_OBJECT_TYPE,

		objectId:
			'publisher/kjvs',

		publisher:
			'publisher',

		resourceId:
			'kjvonly/bible/search/kjvs',

		modifiedAt:
			123
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

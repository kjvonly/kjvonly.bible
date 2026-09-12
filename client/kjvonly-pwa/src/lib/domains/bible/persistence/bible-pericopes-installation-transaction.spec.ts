import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BiblePericopes
} from '$lib/domains/bible/models/bible-pericopes.model';

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
	BIBLE_PERICOPES_OBJECT_TYPE
} from './bible-pericopes-store';

import {
	IndexedDBBiblePericopesInstallationTransaction
} from './bible-pericopes-installation-transaction';

describe(
	'IndexedDBBiblePericopesInstallationTransaction',
	() => {
		it(
			'opens a readwrite transaction over the required object stores',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBiblePericopesInstallationTransaction(
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
			'exposes a transaction-scoped BiblePericopesStore',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBiblePericopesInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				const pericopes =
					createPericopes();

				await transaction.run(
					async (
						stores
					) => {
						await stores.pericopes.put(
							pericopes
						);

						expect(
							await stores.pericopes.get(
								pericopes.id
							)
						).toEqual(
							pericopes
						);
					}
				);

				expect(
					db.getStoredValue(
						DOMAIN_OBJECTS,
						`${BIBLE_PERICOPES_OBJECT_TYPE}:${pericopes.id}`
					)
				).toEqual({
					id:
						`${BIBLE_PERICOPES_OBJECT_TYPE}:${pericopes.id}`,

					objectType:
						BIBLE_PERICOPES_OBJECT_TYPE,

					objectId:
						pericopes.id,

					value:
						pericopes
				});
			}
		);

		it(
			'returns undefined for missing Bible Pericopes',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBiblePericopesInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				await transaction.run(
					async (
						stores
					) => {
						expect(
							await stores.pericopes.get(
								'publisher/default/1_1'
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
					new IndexedDBBiblePericopesInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				const objectId =
					'publisher/default/1_1';

				const installation:
					ResourceInstallation = {
						id:
							createResourceInstallationId(
								BIBLE_PERICOPES_OBJECT_TYPE,
								objectId
							),

						objectType:
							BIBLE_PERICOPES_OBJECT_TYPE,

						objectId,

						publisher:
							'publisher',

						resourceId:
							'kjvonly/overlays/pericopes/default',

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
									BIBLE_PERICOPES_OBJECT_TYPE,
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
					new IndexedDBBiblePericopesInstallationTransaction(
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
					new IndexedDBBiblePericopesInstallationTransaction(
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

function createPericopes():
	BiblePericopes {
	return {
		id:
			'publisher/default/1_1',

		chapterRef:
			'1_1',

		pericopes: {
			'1_1_1': [
				{
					text:
						'The Creation',

					ref:
						'1_1_1',

					words: [
						{
							text:
								'The Creation',

							class:
								null,

							href:
								null,

							emphasis:
								false
						}
					]
				}
			]
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
			get:
				async (
					id: string
				) =>
					store?.get(
						id
					),

			put:
				async (
					value: {
						id: string;
					}
				) => {
					store?.set(
						value.id,
						value
					);
				}
		};
	}
}

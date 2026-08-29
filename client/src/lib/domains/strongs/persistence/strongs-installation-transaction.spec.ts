import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	Strongs
} from '$lib/domains/strongs/models/strongs.model';

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
	STRONGS_DEFINITION_OBJECT_TYPE
} from './strongs-store';

import {
	IndexedDBStrongsInstallationTransaction
} from './strongs-installation-transaction';

describe(
	'IndexedDBStrongsInstallationTransaction',
	() => {
		it(
			'opens a readwrite transaction over the required object stores',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBStrongsInstallationTransaction(
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
			'exposes a transaction-scoped StrongsStore',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBStrongsInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				const strongs =
					createStrongs();

				await transaction.run(
					async (
						stores
					) => {
						await stores.strongs.put(
							strongs
						);

						expect(
							await stores.strongs.get(
								strongs.id
							)
						).toEqual(
							strongs
						);
					}
				);

				expect(
					db.getStoredValue(
						DOMAIN_OBJECTS,
						`${STRONGS_DEFINITION_OBJECT_TYPE}:${strongs.id}`
					)
				).toEqual({
					id:
						`${STRONGS_DEFINITION_OBJECT_TYPE}:${strongs.id}`,

					objectType:
						STRONGS_DEFINITION_OBJECT_TYPE,

					objectId:
						strongs.id,

					value:
						strongs
				});
			}
		);

		it(
			'returns undefined for a missing Strong\'s definition',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBStrongsInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				await transaction.run(
					async (
						stores
					) => {
						expect(
							await stores.strongs.get(
								'publisher/kjvs/G777'
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
					new IndexedDBStrongsInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				const objectId =
					'publisher/kjvs/G1';

				const installation:
					ResourceInstallation = {
						id:
							createResourceInstallationId(
								STRONGS_DEFINITION_OBJECT_TYPE,
								objectId
							),

						objectType:
							STRONGS_DEFINITION_OBJECT_TYPE,

						objectId,

						publisher:
							'publisher',

						resourceId:
							'kjvonly/strongs/definitions/kjvs/G1',

						eventId:
							'event-id',

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
									STRONGS_DEFINITION_OBJECT_TYPE,
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
					new IndexedDBStrongsInstallationTransaction(
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
					new IndexedDBStrongsInstallationTransaction(
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

function createStrongs(): Strongs {
	return {
		id:
			'publisher/kjvs/G1',

		number:
			'G1',

		originalWord:
			'Α',

		partsOfSpeech:
			'noun',

		phoneticSpelling:
			'alpha',

		transliteratedWord:
			'A',

		usageByBook:
			[],

		usageByWord:
			[],

		brownDef:
			null,

		strongsDef:
			'definition',

		thayersDef:
			null
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
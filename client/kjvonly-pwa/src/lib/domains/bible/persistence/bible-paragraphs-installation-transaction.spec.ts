import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleParagraphs
} from '$lib/domains/bible/models/bible-paragraphs.model';

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
	BIBLE_PARAGRAPHS_OBJECT_TYPE
} from './bible-paragraphs-store';

import {
	IndexedDBBibleParagraphsInstallationTransaction
} from './bible-paragraphs-installation-transaction';

describe(
	'IndexedDBBibleParagraphsInstallationTransaction',
	() => {
		it(
			'opens a readwrite transaction over the required object stores',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBibleParagraphsInstallationTransaction(
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
			'exposes a transaction-scoped BibleParagraphsStore',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBibleParagraphsInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				const paragraphs =
					createParagraphs();

				await transaction.run(
					async (
						stores
					) => {
						await stores.paragraphs.put(
							paragraphs
						);

						expect(
							await stores.paragraphs.get(
								paragraphs.id
							)
						).toEqual(
							paragraphs
						);
					}
				);

				expect(
					db.getStoredValue(
						DOMAIN_OBJECTS,
						`${BIBLE_PARAGRAPHS_OBJECT_TYPE}:${paragraphs.id}`
					)
				).toEqual({
					id:
						`${BIBLE_PARAGRAPHS_OBJECT_TYPE}:${paragraphs.id}`,

					objectType:
						BIBLE_PARAGRAPHS_OBJECT_TYPE,

					objectId:
						paragraphs.id,

					value:
						paragraphs
				});
			}
		);

		it(
			'returns undefined for missing Bible Paragraphs',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBBibleParagraphsInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				await transaction.run(
					async (
						stores
					) => {
						expect(
							await stores.paragraphs.get(
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
					new IndexedDBBibleParagraphsInstallationTransaction(
						async () =>
							db.asApplicationDB()
					);

				const objectId =
					'publisher/default/1_1';

				const installation:
					ResourceInstallation = {
						id:
							createResourceInstallationId(
								BIBLE_PARAGRAPHS_OBJECT_TYPE,
								objectId
							),

						objectType:
							BIBLE_PARAGRAPHS_OBJECT_TYPE,

						objectId,

						publisher:
							'publisher',

						resourceId:
							'kjvonly/overlays/paragraphs/default',

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
									BIBLE_PARAGRAPHS_OBJECT_TYPE,
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
					new IndexedDBBibleParagraphsInstallationTransaction(
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
					new IndexedDBBibleParagraphsInstallationTransaction(
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

function createParagraphs():
	BibleParagraphs {
	return {
		id:
			'publisher/default/1_1',

		chapterRef:
			'1_1',

		paragraphs: {
			'1_1_1_0': {},
			'1_1_6_0': {}
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

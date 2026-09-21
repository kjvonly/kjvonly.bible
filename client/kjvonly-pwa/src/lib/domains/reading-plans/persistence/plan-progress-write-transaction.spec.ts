import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PlanProgress
} from '../models/plan-progress';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	OUTBOX,
	createStoredDomainObjectId,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	PLAN_PROGRESS_OBJECT_TYPE
} from './plan-progress-store';

import {
	IndexedDBPlanProgressWriteTransaction
} from './plan-progress-write-transaction';

import type {
	ResourcePublication
} from '$lib/resource';

describe(
	'IndexedDBPlanProgressWriteTransaction',
	() => {
		it(
			'opens one readwrite transaction over Domain Objects, Resource Installations, and Outbox',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBPlanProgressWriteTransaction(
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
					RESOURCE_INSTALLATIONS,
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
			'reads and persists Plan Progress with publication intent under the same Domain Object key',
			async () => {
				const existing:
					PlanProgress = {
						id:
							'publisher/default/subscription-1',
						completedReadingIndexes: [
							0
						]
					};

				const db =
					new FakeApplicationDB();

				db.seedDomainObject(
					existing
				);

				const transaction =
					new IndexedDBPlanProgressWriteTransaction(
						async () =>
							db.asApplicationDB(),
						() => 100
					);

				const updated:
					PlanProgress = {
						id:
							existing.id,
						completedReadingIndexes: [
							0,
							2
						]
					};

				const publication =
					createPublication();

				await transaction.run(
					async (
						stores
					) => {
						await expect(
							stores.progress.get(
								existing.id
							)
						).resolves.toEqual(
							existing
						);

						await stores.progress.put(
							updated
						);

						await stores.outbox.put(
							updated.id,
							publication
						);
					}
				);

				const storedId =
					createStoredDomainObjectId(
						PLAN_PROGRESS_OBJECT_TYPE,
						updated.id
					);

				expect(
					db.getStoredValue(
						DOMAIN_OBJECTS,
						storedId
					)
				).toEqual({
					id:
						storedId,
					objectType:
						PLAN_PROGRESS_OBJECT_TYPE,
					objectId:
						updated.id,
					value:
						updated
				});

				expect(
					db.getStoredValue(
						RESOURCE_INSTALLATIONS,
						storedId
					)
				).toEqual({
					id:
						storedId,
					objectType:
						PLAN_PROGRESS_OBJECT_TYPE,
					objectId:
						updated.id,
					publisher:
						'publisher',
					modifiedAt:
						100
				});

				expect(
					db.getStoredValue(
						OUTBOX,
						storedId
					)
				).toEqual({
					id:
						storedId,
					publication: {
						...publication,
						modifiedAt:
							100
					},
					status:
						'pending',
					attempts:
						0
				});
			}
		);

		it(
			'aborts the shared transaction when the Outbox write fails',
			async () => {
				const error =
					new Error(
						'outbox failed'
					);

				const db =
					new FakeApplicationDB(
						OUTBOX,
						error
					);

				const transaction =
					new IndexedDBPlanProgressWriteTransaction(
						async () =>
							db.asApplicationDB()
					);

				await expect(
					transaction.run(
						async (
							stores
						) => {
							const progress =
								createProgress();

							await stores.progress.put(
								progress
							);

							await stores.outbox.put(
								progress.id,
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

function createProgress(): PlanProgress {
	return {
		id:
			'publisher/default/subscription-1',
		completedReadingIndexes: [
			0,
			2
		]
	};
}

function createPublication(): ResourcePublication {
	return {
		type:
			'resource',

		publisher:
			'publisher',
		resourceType:
			'kjvonly/plans/progress',
		resourceId:
			'kjvonly/plans/progress/default/subscription-1',
		representation:
			'content',
		mediaType:
			'application/json+gzip+hex',
		value: {
			completedReadingIndexes: [
				0,
				2
			]
		}
	};
}

class FakeApplicationDB {
	storeNames:
		readonly string[] =
			[];

	mode = '';
	transactionAbortCount = 0;

	private readonly stores =
		new Map<
			string,
			Map<string, unknown>
		>();

	constructor(
		private readonly failingStore?: string,
		private readonly putError:
			Error =
				new Error(
					'put failed'
				)
	) {}

	asApplicationDB(): ApplicationDB {
		return {
			transaction:
				(
					storeNames:
						readonly string[],
					mode: string
				) =>
					this.createTransaction(
						storeNames,
						mode
					)
		} as unknown as ApplicationDB;
	}

	seedDomainObject(
		progress: PlanProgress
	): void {
		const id =
			createStoredDomainObjectId(
				PLAN_PROGRESS_OBJECT_TYPE,
				progress.id
			);

		this.getStore(
			DOMAIN_OBJECTS
		).set(
			id,
			{
				id,
				objectType:
					PLAN_PROGRESS_OBJECT_TYPE,
				objectId:
					progress.id,
				value:
					progress
			}
		);
	}

	getStoredValue(
		storeName: string,
		id: string
	): unknown {
		return this.stores.get(
			storeName
		)?.get(
			id
		);
	}

	private createTransaction(
		storeNames:
			readonly string[],
		mode: string
	) {
		this.storeNames =
			storeNames;

		this.mode =
			mode;

		let aborted =
			false;

		return {
			objectStore:
				(storeName: string) =>
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

				return Promise.resolve();
			}
		};
	}

	private createObjectStore(
		storeName: string
	) {
		const store =
			this.getStore(
				storeName
			);

		return {
			get:
				async (
					id: string
				) =>
					store.get(
						id
					),

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

					store.set(
						value.id,
						value
					);
				}
		};
	}

	private getStore(
		storeName: string
	): Map<string, unknown> {
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

		return store;
	}
}

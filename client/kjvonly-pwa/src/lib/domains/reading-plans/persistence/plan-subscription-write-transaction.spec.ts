import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PlanSubscription
} from '$lib/domains/reading-plans/models/plan-subscription';

import {
	DOMAIN_OBJECTS,
	OUTBOX,
	createStoredDomainObjectId,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	PLAN_SUBSCRIPTION_OBJECT_TYPE
} from './plan-subscriptions-store';

import {
	IndexedDBPlanSubscriptionWriteTransaction
} from './plan-subscription-write-transaction';

import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

describe(
	'IndexedDBPlanSubscriptionWriteTransaction',
	() => {
		it(
			'opens one readwrite transaction over Domain Objects and Outbox',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBPlanSubscriptionWriteTransaction(
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
			'persists the Plan Subscription and Resource publication under the same Domain Object key',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBPlanSubscriptionWriteTransaction(
						async () =>
							db.asApplicationDB()
					);

				const subscription =
					createSubscription();

				const publication =
					createPublication();

				await transaction.run(
					async (
						stores
					) => {
						await stores
							.subscriptions
							.put(
								subscription
							);

						await stores
							.outbox
							.put(
								subscription.id,
								publication
							);
					}
				);

				const storedId =
					createStoredDomainObjectId(
						PLAN_SUBSCRIPTION_OBJECT_TYPE,
						subscription.id
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
						PLAN_SUBSCRIPTION_OBJECT_TYPE,
					objectId:
						subscription.id,
					value:
						subscription
				});

				expect(
					db.getStoredValue(
						OUTBOX,
						storedId
					)
				).toEqual({
					id:
						storedId,
					publication,
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
					new IndexedDBPlanSubscriptionWriteTransaction(
						async () =>
							db.asApplicationDB()
					);

				await expect(
					transaction.run(
						async (
							stores
						) => {
							const subscription =
								createSubscription();

							await stores
								.subscriptions
								.put(
									subscription
								);

							await stores
								.outbox
								.put(
									subscription.id,
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

function createSubscription(): PlanSubscription {
	return {
		id:
			'publisher/default/subscription-1',
		planDefinitionId:
			'plan-publisher/default/mcheyne',
		name:
			'MCheyne',
		description:
			'Read through the Bible.',
		encodedReadings: [
			'1_1'
		],
		dateSubscribed:
			100
	};
}

function createPublication(): ResourcePublication {
	return {
		type:
			'resource',

		publisher:
			'publisher',
		resourceType:
			'kjvonly/plans/subscriptions',
		resourceId:
			'kjvonly/plans/subscriptions/default/subscription-1',
		representation:
			'content',
		mediaType:
			'application/json+gzip+hex',
		value: {
			name:
				'MCheyne'
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

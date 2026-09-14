import {
	PLAN_SUBSCRIPTION_OBJECT_TYPE
} from './plan-subscriptions-store';

import type {
	PlanSubscriptionWriteStores,
	PlanSubscriptionWriteTransaction
} from '$lib/domains/reading-plans/resources/subscriptions/plan-subscription-write-stores';

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

export class IndexedDBPlanSubscriptionWriteTransaction
	implements PlanSubscriptionWriteTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					PlanSubscriptionWriteStores
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
			PlanSubscriptionWriteStores = {
				subscriptions: {
					put:
						async (
							subscription
						) => {
							const stored:
								StoredDomainObject = {
									id:
										createStoredDomainObjectId(
											PLAN_SUBSCRIPTION_OBJECT_TYPE,
											subscription.id
										),

									objectType:
										PLAN_SUBSCRIPTION_OBJECT_TYPE,

									objectId:
										subscription.id,

									value:
										subscription
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
									PLAN_SUBSCRIPTION_OBJECT_TYPE,
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

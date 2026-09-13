import type {
	PlanSubscription
} from '$lib/domains/reading-plans/models/plan-subscription';

import {
	PLAN_SUBSCRIPTION_OBJECT_TYPE,
	type PlanSubscriptionsStore
} from './plan-subscriptions-store';

import {
	DOMAIN_OBJECTS,
	OBJECT_TYPE_INDEX,
	createStoredDomainObjectId,
	type ApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBPlanSubscriptionsStore
	implements PlanSubscriptionsStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		id: string
	): Promise<
		PlanSubscription |
		undefined
	> {
		const db =
			await this.getDB();

		const stored =
			await db.get(
				DOMAIN_OBJECTS,
				createStoredDomainObjectId(
					PLAN_SUBSCRIPTION_OBJECT_TYPE,
					id
				)
			);

		return stored?.value as
			| PlanSubscription
			| undefined;
	}

	async getAll(): Promise<
		readonly PlanSubscription[]
	> {
		const db =
			await this.getDB();

		const stored =
			await db.getAllFromIndex(
				DOMAIN_OBJECTS,
				OBJECT_TYPE_INDEX,
				PLAN_SUBSCRIPTION_OBJECT_TYPE
			);

		return stored.map(
			(object: StoredDomainObject) =>
				object.value as PlanSubscription
		);
	}

	async put(
		subscription: PlanSubscription
	): Promise<void> {
		const db =
			await this.getDB();

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

		await db.put(
			DOMAIN_OBJECTS,
			stored
		);
	}
}

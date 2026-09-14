import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	PlanSubscription
} from '$lib/domains/reading-plans/models/plan-subscription';

import {
	DOMAIN_OBJECTS,
	OBJECT_TYPE_INDEX,
	createStoredDomainObjectId,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	PLAN_SUBSCRIPTION_OBJECT_TYPE
} from './plan-subscriptions-store';

import {
	IndexedDBPlanSubscriptionsStore
} from './indexeddb-plan-subscriptions-store';

describe(
	'IndexedDBPlanSubscriptionsStore',
	() => {
		it(
			'gets a Plan Subscription from the shared Domain Object store',
			async () => {
				const subscription =
					createSubscription();

				const get =
					vi.fn()
						.mockResolvedValue({
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
						});

				const store =
					createStore({
						get
					});

				await expect(
					store.get(
						subscription.id
					)
				).resolves.toEqual(
					subscription
				);

				expect(
					get
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					createStoredDomainObjectId(
						PLAN_SUBSCRIPTION_OBJECT_TYPE,
						subscription.id
					)
				);
			}
		);

		it(
			'lists Plan Subscriptions with one objectType index query',
			async () => {
				const subscriptions = [
					createSubscription(),
					createSubscription({
						id:
							'publisher/default/subscription-2',
						name:
							'Proverbs'
					})
				];

				const getAllFromIndex =
					vi.fn()
						.mockResolvedValue(
							subscriptions.map(
								(subscription) => ({
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
								})
							)
						);

				const store =
					createStore({
						getAllFromIndex
					});

				await expect(
					store.getAll()
				).resolves.toEqual(
					subscriptions
				);

				expect(
					getAllFromIndex
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					OBJECT_TYPE_INDEX,
					PLAN_SUBSCRIPTION_OBJECT_TYPE
				);
			}
		);

		it(
			'puts a Plan Subscription in the shared Domain Object envelope',
			async () => {
				const put =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const store =
					createStore({
						put
					});

				const subscription =
					createSubscription();

				await store.put(
					subscription
				);

				expect(
					put
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					{
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
					}
				);
			}
		);
	}
);

function createStore(
	db: Partial<ApplicationDB>
): IndexedDBPlanSubscriptionsStore {
	return new IndexedDBPlanSubscriptionsStore(
		async () =>
			db as ApplicationDB
	);
}

function createSubscription(
	overrides:
		Partial<PlanSubscription> =
		{}
): PlanSubscription {
	return {
		id:
			'publisher/default/subscription-1',
		planDefinitionId:
			'publisher/default/mcheyne',
		name:
			'MCheyne',
		description:
			'Read through the Bible.',
		encodedReadings: [
			'1_1'
		],
		dateSubscribed:
			100,
		...overrides
	};
}

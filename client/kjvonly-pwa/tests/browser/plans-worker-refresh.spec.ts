import {
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	PLAN_PUBSUB_SUBSCRIPTIONS,
	PlansPubSubService,
	createPlansWorker,
	type PlanProgress,
	type PlanSubscription
} from '$lib/domains/reading-plans';

import type {
	PlansSubscriptionsMessage
} from '$lib/domains/reading-plans/models/plans-worker.model';

import {
	IndexedDBPlanSubscriptionsStore
} from '$lib/domains/reading-plans/persistence/indexeddb-plan-subscriptions-store';

import {
	IndexedDBPlanProgressStore
} from '$lib/domains/reading-plans/persistence/indexeddb-plan-progress-store';

import {
	DOMAIN_OBJECTS,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

describe(
	'Reading Plans worker refresh',
	() => {
		beforeEach(
			async () => {
				const db =
					await getApplicationDB();

				await db.clear(
					DOMAIN_OBJECTS
				);
			}
		);

		it(
			'reloads accepted subscriptions and progress from IndexedDB inside the worker',
			async () => {
				const worker =
					createPlansWorker();

				expect(
					worker
				).toBeDefined();

				const service =
					new PlansPubSubService(
						worker
					);

				await service.initialize(
					{},
					[],
					[]
				);

				const subscription:
					PlanSubscription = {
						id:
							'publisher/default/subscription-1',

						planDefinitionId:
							'publisher/default/plan-1',

						name:
							'Imported Plan',

						description:
							'Imported through archive state.',

						encodedReadings: [],

						dateSubscribed:
							100
					};

				const progress:
					PlanProgress = {
						id:
							subscription.id,

						completedReadingIndexes: [
							0,
							2
						]
					};

				await new IndexedDBPlanSubscriptionsStore(
					getApplicationDB
				).put(
					subscription
				);

				await new IndexedDBPlanProgressStore(
					getApplicationDB
				).put(
					progress
				);

				const refreshed =
					new Promise<PlansSubscriptionsMessage>(
						(resolve) => {
							service.subscribe(
								PLAN_PUBSUB_SUBSCRIPTIONS.GET_ALL_SUBS,
								resolve,
								'plans-worker-refresh-spec'
							);
						}
					);

				service.refresh();

				const message =
					await refreshed;

				const sub =
					message.subs.get(
						subscription.id
					);

				expect(
					sub
				).toBeDefined();

				expect(
					sub?.name
				).toBe(
					'Imported Plan'
				);

				expect(
					sub?.completedReadingIndexes
				).toEqual(
					new Set([
						0,
						2
					])
				);

				service.unsubscribe(
					'plans-worker-refresh-spec'
				);
			}
		);
	}
);

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createResourceInstallationId,
	createResourceReceiptId
} from '$lib/resource';

import {
	createPlanSubscriptionId
} from '$lib/domains/reading-plans/models/plan-subscription-id';

import {
	IndexedDBPlanSubscriptionsStore
} from '$lib/domains/reading-plans/persistence/indexeddb-plan-subscriptions-store';

import {
	IndexedDBPlanSubscriptionInstallationTransaction
} from '$lib/domains/reading-plans/persistence/plan-subscription-installation-transaction';

import {
	PLAN_SUBSCRIPTION_OBJECT_TYPE
} from '$lib/domains/reading-plans/persistence/plan-subscriptions-store';

import {
	PlanSubscriptionInstaller
} from '$lib/domains/reading-plans/resources/subscriptions/plan-subscription-installer';

import {
	PlanSubscriptionInterpreter
} from '$lib/domains/reading-plans/resources/subscriptions/plan-subscription-interpreter';

import {
	PlanSubscriptionResourceHandler
} from '$lib/domains/reading-plans/resources/subscriptions/plan-subscription-resource-handler';

import {
	PLAN_SUBSCRIPTION_RESOURCE_TYPE
} from '$lib/domains/reading-plans/resources/subscriptions/plan-subscription-resource-source';

import {
	PlanSubscriptionValidator
} from '$lib/domains/reading-plans/resources/subscriptions/plan-subscription-validator';

import {
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	createBrowserTestPublisher,
	createResourceInstallationTestService
} from './support/resource-installation-test-service';

describe(
	'Plan Subscription Resource installation',
	() => {
		it(
			'decodes validates and installs a Plan Subscription into IndexedDB',
			async () => {
				const publisher =
					createBrowserTestPublisher();

				const group =
					'default';

				const resourceSubscriptionId =
					'browser-subscription';

				const resourceId =
					`${PLAN_SUBSCRIPTION_RESOURCE_TYPE}/${group}/${resourceSubscriptionId}`;

				const value = {
					planDefinitionId:
						`${publisher}/default/mcheyne`,

					name:
						'MCheyne',

					description:
						'Browser subscription',

					encodedReadings: [
						'1_1',
						'40_1'
					],

					dateSubscribed:
						100
				};

				const service =
					createResourceInstallationTestService(
						new PlanSubscriptionResourceHandler(
							new PlanSubscriptionInterpreter(),
							new PlanSubscriptionValidator(),
							new PlanSubscriptionInstaller(
								new IndexedDBPlanSubscriptionInstallationTransaction(
									getApplicationDB
								)
							)
						),
						{
							publisher,
							resourceId,
							resourceType:
								PLAN_SUBSCRIPTION_RESOURCE_TYPE,
							value,
							modifiedAt:
								200
						}
					);

				const result =
					await service.install({
						publisher,
						resourceId
					});

				expect(
					result
				).toEqual({
					requested: {
						publisher,
						resourceId
					},

					found:
						true,

					resources: [
						{
							reference: {
								publisher,
								resourceId
							},

							resourceType:
								PLAN_SUBSCRIPTION_RESOURCE_TYPE,

							status:
								'handled'
						}
					]
				});

				const subscriptionId =
					createPlanSubscriptionId(
						publisher,
						group,
						resourceSubscriptionId
					);

				const subscriptionsStore =
					new IndexedDBPlanSubscriptionsStore(
						getApplicationDB
					);

				expect(
					await subscriptionsStore.get(
						subscriptionId
					)
				).toEqual({
					id:
						subscriptionId,

					...value
				});

				const installationId =
					createResourceInstallationId(
						PLAN_SUBSCRIPTION_OBJECT_TYPE,
						subscriptionId
					);

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						installationId
					)
				).toEqual({
					id:
						installationId,

					objectType:
						PLAN_SUBSCRIPTION_OBJECT_TYPE,

					objectId:
						subscriptionId,

					publisher,
					resourceId,
					modifiedAt:
						200
				});

				expect(
					await db.get(
						RESOURCE_RECEIPTS,
						createResourceReceiptId(
							publisher,
							resourceId
						)
					)
				).toEqual({
					id:
						createResourceReceiptId(
							publisher,
							resourceId
						),

					publisher,
					resourceId,
					modifiedAt:
						200
				});
			}
		);
	}
);

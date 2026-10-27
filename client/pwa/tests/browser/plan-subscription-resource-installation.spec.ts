import {
	describe,
	expect,
	it
} from 'vitest';

import {
	GenericResourceInstaller,
	ResourceDataTypeResolver,
	ResourceDomainObjectFactoryResolver,
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
	PLAN_SUBSCRIPTION_OBJECT_TYPE
} from '$lib/domains/reading-plans/persistence/plan-subscriptions-store';

import {
	PLAN_SUBSCRIPTION_DATA_TYPE,
	PLAN_SUBSCRIPTION_DATA_VERSION,
	PLAN_SUBSCRIPTION_RESOURCE_TYPE,
	PlanSubscriptionDataTypeHandler,
	PlanSubscriptionDomainObjectFactory
} from '$lib/domains/reading-plans';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	IndexedDBGenericResourceInstallationTransaction
} from '$lib/resource/installation/indexeddb-generic-resource-installation-transaction';

import {
	createBrowserTestPublisher,
	createGenericResourceInstallationTestService
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
					`kjvonly/reading-plans/plan-subscription/${group}/${resourceSubscriptionId}`;

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

				const genericInstaller =
					new GenericResourceInstaller(
						new ResourceDataTypeResolver([
							new PlanSubscriptionDataTypeHandler()
						]),
						new ResourceDomainObjectFactoryResolver([
							new PlanSubscriptionDomainObjectFactory()
						]),
						new IndexedDBGenericResourceInstallationTransaction(
							getApplicationDB
						)
					);

				const service =
					createGenericResourceInstallationTestService(
						genericInstaller,
						{
							publisher,
							resourceId,
							resourceType:
								PLAN_SUBSCRIPTION_RESOURCE_TYPE,
							dataType:
								PLAN_SUBSCRIPTION_DATA_TYPE,
							dataVersion:
								PLAN_SUBSCRIPTION_DATA_VERSION,
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

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							PLAN_SUBSCRIPTION_OBJECT_TYPE,
							subscriptionId
						)
					)
				).toEqual({
					id:
						createStoredDomainObjectId(
							PLAN_SUBSCRIPTION_OBJECT_TYPE,
							subscriptionId
						),

					objectType:
						PLAN_SUBSCRIPTION_OBJECT_TYPE,

					objectId:
						subscriptionId,

					dataType:
						PLAN_SUBSCRIPTION_DATA_TYPE,

					dataVersion:
						1,

					value: {
						id:
							subscriptionId,

						...value
					}
				});

				const installationId =
					createResourceInstallationId(
						PLAN_SUBSCRIPTION_OBJECT_TYPE,
						subscriptionId
					);

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

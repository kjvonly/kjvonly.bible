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
	IndexedDBPlanProgressStore
} from '$lib/domains/reading-plans/persistence/indexeddb-plan-progress-store';

import {
	PLAN_PROGRESS_OBJECT_TYPE
} from '$lib/domains/reading-plans/persistence/plan-progress-store';

import {
	PLAN_PROGRESS_DATA_TYPE,
	PLAN_PROGRESS_DATA_VERSION,
	PLAN_PROGRESS_RESOURCE_TYPE,
	PlanProgressDataTypeHandler,
	PlanProgressDomainObjectFactory
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
	'Plan Progress Resource installation',
	() => {
		it(
			'decodes validates and installs Plan Progress into IndexedDB',
			async () => {
				const publisher =
					createBrowserTestPublisher();

				const group =
					'default';

				const subscriptionId =
					'browser-subscription';

				const resourceId =
					`kjvonly/reading-plans/plan-progress/${group}/${subscriptionId}`;

				const value = {
					completedReadingIndexes: [
						0,
						2,
						4
					]
				};

				const genericInstaller =
					new GenericResourceInstaller(
						new ResourceDataTypeResolver([
							new PlanProgressDataTypeHandler()
						]),
						new ResourceDomainObjectFactoryResolver([
							new PlanProgressDomainObjectFactory()
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
								PLAN_PROGRESS_RESOURCE_TYPE,
							dataType:
								PLAN_PROGRESS_DATA_TYPE,
							dataVersion:
								PLAN_PROGRESS_DATA_VERSION,
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
								PLAN_PROGRESS_RESOURCE_TYPE,

							status:
								'handled'
						}
					]
				});

				const progressId =
					createPlanSubscriptionId(
						publisher,
						group,
						subscriptionId
					);

				const progressStore =
					new IndexedDBPlanProgressStore(
						getApplicationDB
					);

				expect(
					await progressStore.get(
						progressId
					)
				).toEqual({
					id:
						progressId,

					...value
				});

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							PLAN_PROGRESS_OBJECT_TYPE,
							progressId
						)
					)
				).toEqual({
					id:
						createStoredDomainObjectId(
							PLAN_PROGRESS_OBJECT_TYPE,
							progressId
						),

					objectType:
						PLAN_PROGRESS_OBJECT_TYPE,

					objectId:
						progressId,

					dataType:
						PLAN_PROGRESS_DATA_TYPE,

					dataVersion:
						1,

					value: {
						id:
							progressId,

						...value
					}
				});

				const installationId =
					createResourceInstallationId(
						PLAN_PROGRESS_OBJECT_TYPE,
						progressId
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
						PLAN_PROGRESS_OBJECT_TYPE,

					objectId:
						progressId,

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

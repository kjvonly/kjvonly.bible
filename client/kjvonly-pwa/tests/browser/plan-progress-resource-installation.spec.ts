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
	IndexedDBPlanProgressStore
} from '$lib/domains/reading-plans/persistence/indexeddb-plan-progress-store';

import {
	IndexedDBPlanProgressInstallationTransaction
} from '$lib/domains/reading-plans/persistence/plan-progress-installation-transaction';

import {
	PLAN_PROGRESS_OBJECT_TYPE
} from '$lib/domains/reading-plans/persistence/plan-progress-store';

import {
	PlanProgressInstaller
} from '$lib/domains/reading-plans/resources/progress/plan-progress-installer';

import {
	PlanProgressInterpreter
} from '$lib/domains/reading-plans/resources/progress/plan-progress-interpreter';

import {
	PlanProgressResourceHandler
} from '$lib/domains/reading-plans/resources/progress/plan-progress-resource-handler';

import {
	PLAN_PROGRESS_RESOURCE_TYPE
} from '$lib/domains/reading-plans/resources/progress/plan-progress-resource';

import {
	PlanProgressValidator
} from '$lib/domains/reading-plans/resources/progress/plan-progress-validator';

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
					`${PLAN_PROGRESS_RESOURCE_TYPE}/${group}/${subscriptionId}`;

				const value = {
					completedReadingIndexes: [
						0,
						2,
						4
					]
				};

				const service =
					createResourceInstallationTestService(
						new PlanProgressResourceHandler(
							new PlanProgressInterpreter(),
							new PlanProgressValidator(),
							new PlanProgressInstaller(
								new IndexedDBPlanProgressInstallationTransaction(
									getApplicationDB
								)
							)
						),
						{
							publisher,
							resourceId,
							resourceType:
								PLAN_PROGRESS_RESOURCE_TYPE,
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

				const installationId =
					createResourceInstallationId(
						PLAN_PROGRESS_OBJECT_TYPE,
						progressId
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

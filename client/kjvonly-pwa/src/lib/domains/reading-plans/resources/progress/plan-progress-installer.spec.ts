import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PlanProgress
} from '../../models/plan-progress';

import {
	PLAN_PROGRESS_OBJECT_TYPE
} from '../../persistence/plan-progress-store';

import {
	createResourceInstallationId,
	type DecodedResourceContent,
	type ResourceInstallation
} from '$lib/resource';

import type {
	PlanProgressInstallationStores,
	PlanProgressInstallationTransaction
} from './plan-progress-installation-stores';

import {
	PlanProgressInstaller
} from './plan-progress-installer';

import type {
	ValidatedPlanProgressCandidate
} from './validated-plan-progress-candidate';

const PROGRESS_ID =
	'publisher/default/sub-1';

const RESOURCE_ID =
	'kjvonly/plans/progress/default/sub-1';

describe(
	'PlanProgressInstaller',
	() => {
		it(
			'installs new Plan Progress and Resource Installation',
			async () => {
				const transaction =
					new FakeTransaction();

				await new PlanProgressInstaller(
					transaction
				).install(
					createResource(),
					[
						createCandidate()
					]
				);

				expect(
					transaction.progress.get(
						PROGRESS_ID
					)
				).toEqual({
					id:
						PROGRESS_ID,
					completedReadingIndexes: [
						0,
						2
					]
				});

				expect(
					transaction.resourceInstallations.get(
						createResourceInstallationId(
							PLAN_PROGRESS_OBJECT_TYPE,
							PROGRESS_ID
						)
					)
				).toMatchObject({
					publisher:
						'publisher',
					resourceId:
						RESOURCE_ID,
					modifiedAt:
						200
				});
			}
		);

		it(
			'replaces only when the incoming Resource is newer',
			async () => {
				for (
					const [
						modifiedAt,
						expectedIndexes
					] of [
						[100, [0]],
						[200, [0]],
						[201, [0, 2]]
					] as const
				) {
					const transaction =
						new FakeTransaction();

					transaction.progress.set(
						PROGRESS_ID,
						{
							id:
								PROGRESS_ID,
							completedReadingIndexes: [
								0
							]
						}
					);

					transaction.resourceInstallations.set(
						createResourceInstallationId(
							PLAN_PROGRESS_OBJECT_TYPE,
							PROGRESS_ID
						),
						createInstallation()
					);

					await new PlanProgressInstaller(
						transaction
					).install(
						createResource({
							modifiedAt
						}),
						[
							createCandidate()
						]
					);

					expect(
						transaction.progress.get(
							PROGRESS_ID
						)?.completedReadingIndexes
					).toEqual(
						expectedIndexes
					);
				}
			}
		);
	}
);

function createResource(
	overrides:
		Partial<DecodedResourceContent> =
		{}
): DecodedResourceContent {
	return {
		publisher:
			'publisher',
		resourceId:
			RESOURCE_ID,
		resourceType:
			'kjvonly/plans/progress',
		modifiedAt:
			200,
		mediaType:
			'application/json',
		value: {},
		...overrides
	};
}

function createCandidate(
	overrides:
		Partial<ValidatedPlanProgressCandidate> =
		{}
): ValidatedPlanProgressCandidate {
	return {
		group:
			'default',
		subscriptionId:
			'sub-1',
		progress: {
			completedReadingIndexes: [
				0,
				2
			]
		},
		...overrides
	};
}

function createInstallation(): ResourceInstallation {
	return {
		id:
			createResourceInstallationId(
				PLAN_PROGRESS_OBJECT_TYPE,
				PROGRESS_ID
			),
		objectType:
			PLAN_PROGRESS_OBJECT_TYPE,
		objectId:
			PROGRESS_ID,
		publisher:
			'publisher',
		resourceId:
			RESOURCE_ID,
		modifiedAt:
			200
	};
}

class FakeTransaction
	implements PlanProgressInstallationTransaction {

	readonly progress =
		new Map<string, PlanProgress>();

	readonly resourceInstallations =
		new Map<string, ResourceInstallation>();

	async run<TResult>(
		operation:
			(
				stores:
					PlanProgressInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		return await operation({
			progress: {
				get:
					async (id) =>
						this.progress.get(id),
				put:
					async (progress) => {
						this.progress.set(
							progress.id,
							progress
						);
					}
			},
			resourceInstallations: {
				get:
					async (
						objectType,
						objectId
					) =>
						this.resourceInstallations.get(
							createResourceInstallationId(
								objectType,
								objectId
							)
						),
				put:
					async (installation) => {
						this.resourceInstallations.set(
							installation.id,
							installation
						);
					}
			}
		});
	}
}

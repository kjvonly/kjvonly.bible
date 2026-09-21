import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PlanDefinition
} from '../../models/plan-definition';

import {
	PLAN_DEFINITION_OBJECT_TYPE
} from '../../persistence/plan-definitions-store';

import {
	type DecodedResourceContent,
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource';

import type {
	PlanDefinitionInstallationStores,
	PlanDefinitionInstallationTransaction
} from './plan-definition-installation-stores';

import {
	PlanDefinitionInstaller
} from './plan-definition-installer';

import type {
	ValidatedPlanDefinitionCandidate
} from './validated-plan-definition-candidate';

const DEFINITION_ID =
	'publisher/default/mcheyne';

const RESOURCE_ID =
	'kjvonly/plans/readings/default/mcheyne';

describe(
	'PlanDefinitionInstaller',
	() => {
		it(
			'installs a new Plan Definition and Resource Installation provenance',
			async () => {
				const transaction =
					new FakePlanDefinitionInstallationTransaction();

				const installer =
					new PlanDefinitionInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[
						createCandidate()
					]
				);

				expect(
					transaction.planDefinitions.get(
						DEFINITION_ID
					)
				).toEqual({
					id:
						DEFINITION_ID,

					name:
						'MCheyne',

					description:
						'Read through the Bible.',

					encodedReadings: [
						'1_1'
					]
				});

				const installationId =
					createResourceInstallationId(
						PLAN_DEFINITION_OBJECT_TYPE,
						DEFINITION_ID
					);

				expect(
					transaction.resourceInstallations.get(
						installationId
					)
				).toEqual({
					id:
						installationId,

					objectType:
						PLAN_DEFINITION_OBJECT_TYPE,

					objectId:
						DEFINITION_ID,

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
			'replaces a Plan Definition when the Resource is newer',
			async () => {
				const transaction =
					new FakePlanDefinitionInstallationTransaction();

				transaction.planDefinitions.set(
					DEFINITION_ID,
					createDefinition({
						description:
							'Old description.'
					})
				);

				transaction.resourceInstallations.set(
					createResourceInstallationId(
						PLAN_DEFINITION_OBJECT_TYPE,
						DEFINITION_ID
					),
					createInstallation({
						modifiedAt:
							100
					})
				);

				const installer =
					new PlanDefinitionInstaller(
						transaction
					);

				await installer.install(
					createResource({
						modifiedAt:
							200
					}),
					[
						createCandidate({
							definition: {
								name:
									'MCheyne',

								description:
									'New description.',

								encodedReadings: [
									'1_1'
								]
							}
						})
					]
				);

				expect(
					transaction.planDefinitions.get(
						DEFINITION_ID
					)?.description
				).toBe(
					'New description.'
				);

				expect(
					transaction.resourceInstallations.get(
						createResourceInstallationId(
							PLAN_DEFINITION_OBJECT_TYPE,
							DEFINITION_ID
						)
					)?.modifiedAt
				).toBe(
					200
				);
			}
		);

		it(
			'does not replace a Plan Definition when the Resource is older or equal',
			async () => {
				for (
					const modifiedAt
					of [100, 200]
				) {
					const transaction =
						new FakePlanDefinitionInstallationTransaction();

					transaction.planDefinitions.set(
						DEFINITION_ID,
						createDefinition({
							description:
								'Current description.'
						})
					);

					transaction.resourceInstallations.set(
						createResourceInstallationId(
							PLAN_DEFINITION_OBJECT_TYPE,
							DEFINITION_ID
						),
						createInstallation({
							modifiedAt:
								200
						})
					);

					const installer =
						new PlanDefinitionInstaller(
							transaction
						);

					await installer.install(
						createResource({
							modifiedAt
						}),
						[
							createCandidate({
								definition: {
									name:
										'MCheyne',

									description:
										'Stale description.',

									encodedReadings: [
										'1_1'
									]
								}
							})
						]
					);

					expect(
						transaction.planDefinitions.get(
							DEFINITION_ID
						)?.description
					).toBe(
						'Current description.'
					);

					expect(
						transaction.planDefinitionPutCount
					).toBe(
						0
					);

					expect(
						transaction.resourceInstallationPutCount
					).toBe(
						0
					);
				}
			}
		);

		it(
			'requires exactly one Plan Definition candidate',
			async () => {
				const installer =
					new PlanDefinitionInstaller(
						new FakePlanDefinitionInstallationTransaction()
					);

				await expect(
					installer.install(
						createResource(),
						[]
					)
				).rejects.toThrow(
					'Plan Definition Resource must contain exactly one Plan Definition.'
				);

				await expect(
					installer.install(
						createResource(),
						[
							createCandidate(),
							createCandidate({
								planKey:
									'proverbs'
							})
						]
					)
				).rejects.toThrow(
					'Plan Definition Resource must contain exactly one Plan Definition.'
				);
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
			'kjvonly/plans/readings',

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
		Partial<ValidatedPlanDefinitionCandidate> =
		{}
): ValidatedPlanDefinitionCandidate {
	return {
		group:
			'default',

		planKey:
			'mcheyne',

		definition: {
			name:
				'MCheyne',

			description:
				'Read through the Bible.',

			encodedReadings: [
				'1_1'
			]
		},

		...overrides
	};
}

function createDefinition(
	overrides:
		Partial<PlanDefinition> =
		{}
): PlanDefinition {
	return {
		id:
			DEFINITION_ID,

		name:
			'MCheyne',

		description:
			'Read through the Bible.',

		encodedReadings: [
			'1_1'
		],

		...overrides
	};
}

function createInstallation(
	overrides:
		Partial<ResourceInstallation> =
		{}
): ResourceInstallation {
	return {
		id:
			createResourceInstallationId(
				PLAN_DEFINITION_OBJECT_TYPE,
				DEFINITION_ID
			),

		objectType:
			PLAN_DEFINITION_OBJECT_TYPE,

		objectId:
			DEFINITION_ID,

		publisher:
			'publisher',

		resourceId:
			RESOURCE_ID,

		modifiedAt:
			200,

		...overrides
	};
}

class FakePlanDefinitionInstallationTransaction
	implements PlanDefinitionInstallationTransaction {

	readonly planDefinitions =
		new Map<
			string,
			PlanDefinition
		>();

	readonly resourceInstallations =
		new Map<
			string,
			ResourceInstallation
		>();

	planDefinitionPutCount =
		0;

	resourceInstallationPutCount =
		0;

	async run<TResult>(
		operation:
			(
				stores:
					PlanDefinitionInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		return await operation({
			planDefinitions: {
				get:
					async (
						id
					) =>
						this.planDefinitions.get(
							id
						),

				put:
					async (
						definition
					) => {
						this.planDefinitionPutCount++;

						this.planDefinitions.set(
							definition.id,
							definition
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
					async (
						installation
					) => {
						this.resourceInstallationPutCount++;

						this.resourceInstallations.set(
							installation.id,
							installation
						);
					}
			}
		});
	}
}

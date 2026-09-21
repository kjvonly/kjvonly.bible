import type {
	PlanDefinition
} from '../../models/plan-definition';

import {
	createPlanDefinitionId
} from '../../models/plan-definition-id';

import {
	PLAN_DEFINITION_OBJECT_TYPE
} from '../../persistence/plan-definitions-store';

import {
	type DecodedResourceContent,
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource';

import type {
	PlanDefinitionInstallationTransaction
} from './plan-definition-installation-stores';

import type {
	ValidatedPlanDefinitionCandidate
} from './validated-plan-definition-candidate';

export class PlanDefinitionInstaller {

	constructor(
		private readonly transaction:
			PlanDefinitionInstallationTransaction
	) {}

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedPlanDefinitionCandidate[]
	): Promise<void> {
		if (
			candidates.length !==
			1
		) {
			throw new Error(
				'Plan Definition Resource must contain exactly one Plan Definition.'
			);
		}

		const candidate =
			candidates[0];

		const definitionId =
			createPlanDefinitionId(
				resource.publisher,
				candidate.group,
				candidate.planKey
			);

		await this.transaction.run(
			async (
				stores
			) => {
				const currentInstallation =
					await stores
						.resourceInstallations
						.get(
							PLAN_DEFINITION_OBJECT_TYPE,
							definitionId
						);

				if (
					currentInstallation &&
					resource.modifiedAt <=
						currentInstallation.modifiedAt
				) {
					return;
				}

				const definition:
					PlanDefinition = {
						id:
							definitionId,

						...candidate.definition
					};

				const installation:
					ResourceInstallation = {
						id:
							createResourceInstallationId(
								PLAN_DEFINITION_OBJECT_TYPE,
								definitionId
							),

						objectType:
							PLAN_DEFINITION_OBJECT_TYPE,

						objectId:
							definitionId,

						publisher:
							resource.publisher,

						resourceId:
							resource.resourceId,

						modifiedAt:
							resource.modifiedAt
					};

				await stores
					.planDefinitions
					.put(
						definition
					);

				await stores
					.resourceInstallations
					.put(
						installation
					);
			}
		);
	}
}

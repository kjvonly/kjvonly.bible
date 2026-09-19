import {
	z
} from 'zod';

import type {
	ResourceValidator
} from '$lib/resource';

import type {
	PlanDefinitionCandidate
} from './plan-definition-candidate';

import type {
	ValidatedPlanDefinitionCandidate
} from './validated-plan-definition-candidate';

const planDefinitionSchema =
	z.object({
		name:
			z.string()
				.min(1),

		description:
			z.string(),

		encodedReadings:
			z.array(
				z.string()
					.min(1)
			)
	})
		.strict();

export class PlanDefinitionValidator
	implements ResourceValidator<
		PlanDefinitionCandidate,
		ValidatedPlanDefinitionCandidate
	> {

	validate(
		candidate:
			PlanDefinitionCandidate
	): ValidatedPlanDefinitionCandidate {
		const definition =
			planDefinitionSchema.parse(
				candidate.value
			);

		return {
			group:
				candidate.group,

			planKey:
				candidate.planKey,

			definition: {
				name:
					definition.name,

				description:
					definition.description,

				encodedReadings:
					definition.encodedReadings
			}
		};
	}
}

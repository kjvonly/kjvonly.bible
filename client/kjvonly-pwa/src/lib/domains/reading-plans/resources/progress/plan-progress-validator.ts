import {
	z
} from 'zod';

import type {
	ResourceValidator
} from '$lib/resource';

import type {
	PlanProgressCandidate
} from './plan-progress-candidate';

import type {
	ValidatedPlanProgressCandidate
} from './validated-plan-progress-candidate';

const planProgressSchema =
	z.object({
		completedReadingIndexes:
			z.array(
				z.number()
					.int()
					.nonnegative()
					.refine(
						Number.isSafeInteger,
						'Plan reading index must be a safe integer'
					)
			)
	})
	.strict();

export class PlanProgressValidator
	implements ResourceValidator<
		PlanProgressCandidate,
		ValidatedPlanProgressCandidate
	> {

	validate(
		candidate:
			PlanProgressCandidate
	): ValidatedPlanProgressCandidate {
		const progress =
			planProgressSchema.parse(
				candidate.value
			);

		return {
			group:
				candidate.group,

			subscriptionId:
				candidate.subscriptionId,

			progress: {
				completedReadingIndexes:
					progress.completedReadingIndexes
			}
		};
	}
}

import {
	z
} from 'zod';

import type {
	ResourceValidator
} from '$lib/resource';

import type {
	PlanSubscriptionCandidate
} from './plan-subscription-candidate';

import type {
	ValidatedPlanSubscriptionCandidate
} from './validated-plan-subscription-candidate';

const planSubscriptionSchema =
	z.object({
		planDefinitionId:
			z.string()
				.min(1),

		name:
			z.string()
				.min(1),

		description:
			z.string(),

		encodedReadings:
			z.array(
				z.string()
					.min(1)
			),

		dateSubscribed:
			z.number()
				.finite()
				.nonnegative()
	})
		.strict();

export class PlanSubscriptionValidator
	implements ResourceValidator<
		PlanSubscriptionCandidate,
		ValidatedPlanSubscriptionCandidate
	> {

	validate(
		candidate:
			PlanSubscriptionCandidate
	): ValidatedPlanSubscriptionCandidate {
		const subscription =
			planSubscriptionSchema.parse(
				candidate.value
			);

		return {
			group:
				candidate.group,

			subscriptionId:
				candidate.subscriptionId,

			subscription: {
				planDefinitionId:
					subscription.planDefinitionId,

				name:
					subscription.name,

				description:
					subscription.description,

				encodedReadings:
					subscription.encodedReadings,

				dateSubscribed:
					subscription.dateSubscribed
			}
		};
	}
}

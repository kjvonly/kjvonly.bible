import {
	z
} from 'zod';

import type {
	ResourceDataTypeHandler
} from '$lib/resource';

import {
	PLAN_SUBSCRIPTION_DATA_TYPE,
	PLAN_SUBSCRIPTION_DATA_VERSION
} from './plan-subscription-resource-source';

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

export interface PlanSubscriptionResourceData {
	readonly planDefinitionId:
		string;

	readonly name:
		string;

	readonly description:
		string;

	readonly encodedReadings:
		readonly string[];

	readonly dateSubscribed:
		number;
}

/** Validates the published Plan Subscription Resource payload contract. */
export class PlanSubscriptionDataTypeHandler
	implements ResourceDataTypeHandler<PlanSubscriptionResourceData> {

	readonly dataType =
		PLAN_SUBSCRIPTION_DATA_TYPE;

	readonly dataVersion =
		PLAN_SUBSCRIPTION_DATA_VERSION;

	validate(
		value: unknown
	): PlanSubscriptionResourceData {
		return validatePlanSubscription(
			value
		);
	}
}


function validatePlanSubscription(
	value: unknown
): PlanSubscriptionResourceData {
	const subscription =
		planSubscriptionSchema.parse(
			value
		);

	return {
		planDefinitionId:
			subscription.planDefinitionId,

		name:
			subscription.name,

		description:
			subscription.description,

		encodedReadings: [
			...subscription.encodedReadings
		],

		dateSubscribed:
			subscription.dateSubscribed
	};
}

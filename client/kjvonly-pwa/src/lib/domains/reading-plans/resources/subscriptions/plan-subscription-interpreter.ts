import type {
	DecodedResourceContent,
	ResourceInterpreter
} from '$lib/resource';

import {
	parseResourceIdentifier
} from '$lib/resource';

import type {
	PlanSubscriptionCandidate
} from './plan-subscription-candidate';

import {
	PLAN_SUBSCRIPTION_RESOURCE_TYPE
} from './plan-subscription-resource-source';

export class PlanSubscriptionInterpreter
	implements ResourceInterpreter<
		PlanSubscriptionCandidate
	> {

	readonly resourceType =
		PLAN_SUBSCRIPTION_RESOURCE_TYPE;

	interpret(
		resource:
			DecodedResourceContent
	): Iterable<PlanSubscriptionCandidate> {
		if (
			resource.resourceType !==
			this.resourceType
		) {
			throw new Error(
				`Invalid Plan Subscription Resource Type: ${resource.resourceType}`
			);
		}

		const identifier =
			parseResourceIdentifier(
				resource.resourceId
			);

		if (
			identifier.resourceType !==
			this.resourceType
		) {
			throw new Error(
				`Invalid Plan Subscription Resource Identifier: ${resource.resourceId}`
			);
		}

		if (
			identifier.path.length !==
			2
		) {
			throw new Error(
				`Invalid Plan Subscription Resource path: ${resource.resourceId}`
			);
		}

		const [
			group,
			subscriptionId
		] = identifier.path;

		return [
			{
				group,
				subscriptionId,
				value:
					resource.value
			}
		];
	}
}

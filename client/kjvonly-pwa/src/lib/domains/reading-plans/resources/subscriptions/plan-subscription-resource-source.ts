import type {
	PublishedResourceReference
} from '$lib/resource';

import {
	parseResourceIdentifier
} from '$lib/resource';

import {
	createPlanSubscriptionId
} from '../../models/plan-subscription-id';

export const PLAN_SUBSCRIPTION_RESOURCE_TYPE =
	'kjvonly/plans/subscriptions';

export const DEFAULT_PLAN_SUBSCRIPTION_GROUP =
	'default';

export interface PlanSubscriptionResourceSource {
	readonly group: string;
}

export function parsePlanSubscriptionResourceSource(
	source: PublishedResourceReference
): PlanSubscriptionResourceSource {
	const identifier =
		parseResourceIdentifier(
			source.resourceId
		);

	if (
		identifier.resourceType !==
		PLAN_SUBSCRIPTION_RESOURCE_TYPE ||
		identifier.path.length !== 1
	) {
		throw new Error(
			`Invalid Plan Subscription Resource source: ${source.resourceId}`
		);
	}

	return {
		group:
			identifier.path[0]
	};
}

export function createDefaultPlanSubscriptionSelection(
	publisher: string
): PublishedResourceReference {
	return {
		publisher,
		resourceId:
			`${PLAN_SUBSCRIPTION_RESOURCE_TYPE}/${DEFAULT_PLAN_SUBSCRIPTION_GROUP}`
	};
}

export function createPlanSubscriptionIdForSource(
	source: PublishedResourceReference,
	subscriptionId: string
): string {
	const {
		group
	} = parsePlanSubscriptionResourceSource(
		source
	);

	return createPlanSubscriptionId(
		source.publisher,
		group,
		subscriptionId
	);
}

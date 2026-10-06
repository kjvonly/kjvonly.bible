import type {
	PublishedResourceReference
} from '$lib/resource';

import {
	createPlanSubscriptionId
} from '../../models/plan-subscription-id';

import {
	createReadingPlanResourceId,
	parseReadingPlanResourceId
} from '../reading-plan-resource-id';

/** Application type represented by Reading Plan Subscription Resources. */
export const PLAN_SUBSCRIPTION_RESOURCE_TYPE =
	'reading-plans/plan-subscription';

/** Semantic payload contract for Reading Plan subscriptions. */
export const PLAN_SUBSCRIPTION_DATA_TYPE =
	'kjvonly.reading-plan.subscription';

/** Current semantic version of the Reading Plan subscription payload contract. */
export const PLAN_SUBSCRIPTION_DATA_VERSION =
	1;

export const DEFAULT_PLAN_SUBSCRIPTION_GROUP =
	'default';

export interface PlanSubscriptionResourceIdentity {
	readonly group: string;
	readonly subscriptionId?: string;
}

export interface PlanSubscriptionResourceSource {
	readonly group: string;
}

export function createPlanSubscriptionResourceId(
	group: string,
	subscriptionId?: string
): string {
	return createReadingPlanResourceId(
		'plan-subscription',
		group,
		...(subscriptionId === undefined
			? []
			: [subscriptionId])
	);
}

export function parsePlanSubscriptionResourceId(
	resourceId: string
): PlanSubscriptionResourceIdentity {
	const [
		group,
		subscriptionId
	] = parseReadingPlanResourceId(
		resourceId,
		'plan-subscription',
		[1, 2],
		'Plan Subscription'
	);

	return {
		group,
		...(subscriptionId === undefined
			? {}
			: { subscriptionId })
	};
}

export function parsePlanSubscriptionResourceSource(
	source: PublishedResourceReference
): PlanSubscriptionResourceSource {
	const identity =
		parsePlanSubscriptionResourceId(
			source.resourceId
		);

	if (
		identity.subscriptionId !== undefined
	) {
		throw new Error(
			`Invalid Plan Subscription Resource source: ${source.resourceId}`
		);
	}

	return {
		group:
			identity.group
	};
}

export function createDefaultPlanSubscriptionSelection(
	publisher: string
): PublishedResourceReference {
	return {
		publisher,
		resourceId:
			createPlanSubscriptionResourceId(
				DEFAULT_PLAN_SUBSCRIPTION_GROUP
			)
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

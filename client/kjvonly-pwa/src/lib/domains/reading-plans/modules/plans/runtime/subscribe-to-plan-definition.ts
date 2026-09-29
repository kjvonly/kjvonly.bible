import type {
	ApplicationContext,
	NavigationState
} from '$lib/application';

import type {
	PlanDefinitionView
} from '../../../models/plans.model';
import type {
	PlanSubscription
} from '../../../models/plan-subscription';
import {
	PLAN_SUBSCRIPTION_RESOURCE_TYPE,
	createPlanSubscriptionIdForSource
} from '../../../resources/subscriptions/plan-subscription-resource-source';
import {
	initializePlansRuntime
} from './initialize-plans-runtime';

import uuid4 from 'uuid4';

/**
 * Creates and publishes a subscription for one discovered Plan definition.
 *
 * Discovery list cards and Plan Preview both use this boundary so the persisted
 * subscription and worker/pubsub update cannot drift between entry points.
 */
export async function subscribeToPlanDefinition(
	plan: PlanDefinitionView,
	navigationState: NavigationState,
	application: ApplicationContext
): Promise<PlanSubscription> {
	await initializePlansRuntime(
		navigationState,
		application
	);

	const subscriptionSource =
		application
			.moduleResourceSelectionResolver
			.require(
				navigationState,
				PLAN_SUBSCRIPTION_RESOURCE_TYPE
			);

	const subscription: PlanSubscription = {
		id:
			createPlanSubscriptionIdForSource(
				subscriptionSource,
				uuid4()
			),
		planDefinitionId:
			plan.id,
		name:
			plan.name,
		description:
			plan.description,
		encodedReadings: [
			...plan.encodedReadings
		],
		dateSubscribed:
			Date.now()
	};

	await application
		.planSubscriptionsService
		.put(
			subscription
		);

	application
		.plansPubSubService
		.putSub(
			subscription
		);

	return subscription;
}

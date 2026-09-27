import type {
	NavigationStateValue,
	PaneNavigation
} from '$lib/application';

import {
	PLAN_NAVIGATION_RESULTS,
	PLAN_SUBSCRIPTION_ACTIONS,
	PLANS_VIEWS,
	type PlanSubscriptionAction
} from '../../../models/plans.model';

type WhenActive = (
	handler: () => void | Promise<void>
) => () => void;

/**
 * Handles a subscription-actions result after the action-menu entry is popped.
 *
 * The action menu reports intent only. The subscriptions view owns which
 * sibling Plans view is opened next.
 */
export function handlePlanSubscriptionActionNavigationResult(
	result: NavigationStateValue,
	navigation: PaneNavigation,
	whenActive: WhenActive
): void {
	if (
		!isRecord(result) ||
		result.type !==
			PLAN_NAVIGATION_RESULTS.SUBSCRIPTION_ACTION ||
		!isPlanSubscriptionAction(
			result.action
		)
	) {
		return;
	}

	const action =
		result.action;

	whenActive(() => {
		switch (action) {
			case PLAN_SUBSCRIPTION_ACTIONS.PLANS:
				navigation.pushView(
					PLANS_VIEWS.PLANS_LIST,
					{}
				);
				return;

			case PLAN_SUBSCRIPTION_ACTIONS.NEXT_READINGS:
				navigation.pushView(
					PLANS_VIEWS.NEXT_LIST,
					{}
				);
		}
	});
}

function isPlanSubscriptionAction(
	value: unknown
): value is PlanSubscriptionAction {
	return (
		value ===
			PLAN_SUBSCRIPTION_ACTIONS.PLANS ||
		value ===
			PLAN_SUBSCRIPTION_ACTIONS.NEXT_READINGS
	);
}

function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value)
	);
}

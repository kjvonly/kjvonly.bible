import type {
	NavigationStateValue,
	PaneNavigation
} from '$lib/application';

import {
	PLAN_NAVIGATION_RESULTS
} from '../../../models/plans.model';

type WhenActive = (
	handler: () => void | Promise<void>
) => () => void;

/**
 * Handles successful plan subscription returned by discovery details.
 *
 * The details view reports the completed subscription. The discovery parent
 * owns returning to the subscriptions view after its child is popped.
 */
export function handlePlanDiscoveryNavigationResult(
	result: NavigationStateValue,
	navigation: PaneNavigation,
	whenActive: WhenActive
): void {
	if (
		!isRecord(result) ||
		result.type !==
			PLAN_NAVIGATION_RESULTS.PLAN_SUBSCRIBED
	) {
		return;
	}

	whenActive(() => {
		navigation.back();
	});
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

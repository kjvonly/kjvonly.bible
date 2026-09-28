import {
	Modules,
	type NavigationEntryContext,
	type NavigationStateValue,
	type PaneNavigation
} from '$lib/application';

import {
	BIBLE_VIEWS
} from '../../../models/bible-navigation.model';

import {
	SEARCH_NAVIGATION_RESULTS,
	SEARCH_OVERFLOW_ACTIONS,
	type SearchOverflowAction
} from '../../../models/search-navigation.model';

interface SearchOverflowNavigationResultContext {
	navigation: PaneNavigation;
	whenActive:
		NavigationEntryContext['whenActive'];
}

/**
 * Handles an overflow action returned to the owning Search view.
 *
 * The menu reports intent through backWithResult(). Search waits until its
 * entry is active again before opening the requested sibling view.
 */
export function handleSearchOverflowNavigationResult(
	result: NavigationStateValue,
	context: SearchOverflowNavigationResultContext
): boolean {
	if (
		!isRecord(result) ||
		result.type !==
			SEARCH_NAVIGATION_RESULTS.OVERFLOW_ACTION ||
		!isSearchOverflowAction(result.action)
	) {
		return false;
	}

	context.whenActive(() => {
		applySearchOverflowAction(
			result.action,
			context.navigation
		);
	});

	return true;
}

function applySearchOverflowAction(
	action: SearchOverflowAction,
	navigation: PaneNavigation
): void {
	switch (action) {
		case SEARCH_OVERFLOW_ACTIONS.BIBLE_VERSION:
			navigation.pushModule(
				Modules.BIBLE,
				BIBLE_VIEWS.VERSION,
				{}
			);
			return;
	}
}

function isSearchOverflowAction(
	value: unknown
): value is SearchOverflowAction {
	return (
		value ===
			SEARCH_OVERFLOW_ACTIONS.BIBLE_VERSION
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

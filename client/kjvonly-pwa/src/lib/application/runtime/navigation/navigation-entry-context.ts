import {
	getContext,
	setContext
} from 'svelte';

import type {
	NavigationState
} from '../../services/navigation.service';

export interface NavigationEntryContext {
	readonly navigationState:
		NavigationState;
}

const NAVIGATION_ENTRY_CONTEXT =
	Symbol(
		'kjvonly.navigation-entry-context'
	);

/**
 * Provides the NavigationState owned by one mounted navigation entry.
 *
 * Each entry gets its own context so hidden mounted views continue resolving
 * state and Resources from their own navigation interaction rather than the
 * active top entry in the Pane.
 */
export function provideNavigationEntryContext(
	context: NavigationEntryContext
): void {
	setContext(
		NAVIGATION_ENTRY_CONTEXT,
		context
	);
}

/**
 * Returns the NavigationState owned by the nearest mounted navigation entry.
 */
export function useNavigationEntryContext():
	NavigationEntryContext {
	const context =
		getContext<
			NavigationEntryContext |
			undefined
		>(
			NAVIGATION_ENTRY_CONTEXT
		);

	if (!context) {
		throw new Error(
			'Navigation entry context is not available.'
		);
	}

	return context;
}

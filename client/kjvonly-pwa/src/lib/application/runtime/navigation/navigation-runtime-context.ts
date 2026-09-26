import {
	getContext,
	setContext
} from 'svelte';

import type {
	PaneNavigationService
} from '$lib/application/services/pane-navigation.service';

export interface NavigationRuntimeContext {
	readonly navigation: PaneNavigationService;
}

const NAVIGATION_RUNTIME_CONTEXT =
	Symbol(
		'kjvonly.navigation-runtime-context'
	);

/**
 * Provides one Pane-local navigation runtime to all mounted views in that Pane.
 */
export function provideNavigationRuntimeContext(
	context: NavigationRuntimeContext
): void {
	setContext(
		NAVIGATION_RUNTIME_CONTEXT,
		context
	);
}

/**
 * Returns the navigation runtime owned by the current Pane.
 */
export function useNavigationRuntimeContext():
	NavigationRuntimeContext {
	const context =
		getContext<
			NavigationRuntimeContext |
			undefined
		>(
			NAVIGATION_RUNTIME_CONTEXT
		);

	if (!context) {
		throw new Error(
			'Navigation runtime context is not available.'
		);
	}

	return context;
}

import {
	getContext,
	setContext
} from 'svelte';

import type {
	PublishedResourceReference
} from '$lib/resource';

import type {
	NavigationState,
	NavigationStateValue
} from '../../services/navigation.service';

export interface NavigationEntryContext {
	readonly navigationState:
		NavigationState;

	/**
	 * Returns whether this navigation entry is currently the active top entry.
	 */
	isActive(): boolean;

	/**
	 * Registers a runtime-only result handler for this navigation entry.
	 */
	onResult(
		handler: (
			result: NavigationStateValue
		) => void | Promise<void>
	): () => void;

	/**
	 * Runs a callback once this mounted navigation entry is active.
	 *
	 * If the entry is already active, the callback runs immediately.
	 */
	whenActive(
		handler: () => void | Promise<void>
	): () => void;

	/**
	 * Updates semantic state owned by this navigation entry and persists it.
	 */
	updateState(
		key: string,
		value: NavigationStateValue | undefined
	): void;

	/**
	 * Updates one Resource selection owned by this active navigation entry.
	 */
	updateResourceSelection(
		resourceType: string,
		value: PublishedResourceReference
	): void;
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

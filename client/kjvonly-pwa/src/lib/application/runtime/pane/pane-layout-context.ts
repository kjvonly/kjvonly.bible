import {
	getContext,
	setContext
} from 'svelte';

/**
 * Reactive layout measurements owned by one rendered Pane.
 *
 * The Pane provides a Svelte `$state` object implementing this contract so
 * descendants react when the rendered Pane is resized.
 */
export interface PaneLayoutContext {
	clientHeight: number;
}

const PANE_LAYOUT_CONTEXT =
	Symbol(
		'kjvonly.pane-layout-context'
	);

/**
 * Provides the reactive layout state owned by the current Pane.
 */
export function providePaneLayoutContext(
	context: PaneLayoutContext
): void {
	setContext(
		PANE_LAYOUT_CONTEXT,
		context
	);
}

/**
 * Returns the reactive layout state owned by the current Pane.
 */
export function usePaneLayoutContext():
	Readonly<PaneLayoutContext> {
	const context =
		getContext<
			PaneLayoutContext |
				undefined
		>(
			PANE_LAYOUT_CONTEXT
		);

	if (!context) {
		throw new Error(
			'Pane layout context is not available.'
		);
	}

	return context;
}

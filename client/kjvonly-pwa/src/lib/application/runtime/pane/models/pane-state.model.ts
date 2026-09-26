/**
 * Persisted runtime state owned directly by one leaf Pane.
 *
 * NavigationState owns Module-specific semantic state and Resource selections.
 */
export type PaneState =
	Record<string, unknown>;

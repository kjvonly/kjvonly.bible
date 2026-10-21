import {
	Modules,
	MODULES_VIEWS,
	PaneSplit,
	type NavigationEntryContext,
	type NavigationStateValue,
	type PaneNavigation
} from '$lib/application';

import {
	NORMALIZED_CONTENT_NAVIGATION_RESULTS,
	NORMALIZED_CONTENT_OVERFLOW_ACTIONS,
	type NormalizedContentOverflowAction
} from '../../../models/normalized-content-navigation.model';

interface NormalizedContentOverflowNavigationResultContext {
	navigation: PaneNavigation;
	whenActive: NavigationEntryContext['whenActive'];
	/** Opens document-scoped Bookmarks using the Reader's current descriptor. */
	onBrowseDocumentBookmarks: () => void;
}

/**
 * Applies menu commands only after Back reveals the mounted Reader again.
 * This leaves the Reader's document and navigation sequence unchanged.
 */
export function handleNormalizedContentOverflowNavigationResult(
	result: NavigationStateValue,
	context: NormalizedContentOverflowNavigationResultContext
): boolean {
	if (
		!isRecord(result) ||
		result.type !== NORMALIZED_CONTENT_NAVIGATION_RESULTS.OVERFLOW_ACTION ||
		!isNormalizedContentOverflowAction(result.action)
	) {
		return false;
	}

	context.whenActive(() => {
		applyOverflowAction(result.action, context);
	});
	return true;
}

function applyOverflowAction(
	action: NormalizedContentOverflowAction,
	context: NormalizedContentOverflowNavigationResultContext
): void {
	switch (action) {
		case NORMALIZED_CONTENT_OVERFLOW_ACTIONS.BROWSE_DOCUMENT_BOOKMARKS:
			context.onBrowseDocumentBookmarks();
			return;
		case NORMALIZED_CONTENT_OVERFLOW_ACTIONS.SPLIT_HORIZONTAL:
			context.navigation.split(PaneSplit.HORIZONTAL, Modules.MODULES, MODULES_VIEWS.ROOT, {});
			return;
		case NORMALIZED_CONTENT_OVERFLOW_ACTIONS.SPLIT_VERTICAL:
			context.navigation.split(PaneSplit.VERTICAL, Modules.MODULES, MODULES_VIEWS.ROOT, {});
	}
}

function isNormalizedContentOverflowAction(
	value: unknown
): value is NormalizedContentOverflowAction {
	return (
		value === NORMALIZED_CONTENT_OVERFLOW_ACTIONS.SPLIT_HORIZONTAL ||
		value === NORMALIZED_CONTENT_OVERFLOW_ACTIONS.SPLIT_VERTICAL ||
		value === NORMALIZED_CONTENT_OVERFLOW_ACTIONS.BROWSE_DOCUMENT_BOOKMARKS
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

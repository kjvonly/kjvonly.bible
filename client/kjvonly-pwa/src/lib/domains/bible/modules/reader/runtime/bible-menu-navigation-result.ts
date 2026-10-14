import {
	Modules,
	MODULES_VIEWS,
	PaneSplit,
	type NavigationEntryContext,
	type NavigationStateValue,
	type PaneNavigation
} from '$lib/application';

import { BOOKMARKS_VIEWS } from '$lib/domains/bookmarks';

import {
	BIBLE_MENU_ACTIONS,
	BIBLE_NAVIGATION_RESULTS,
	BIBLE_VIEWS,
	type BibleMenuAction
} from '../../../models/bible-navigation.model';

/** Runtime state required to apply an overflow-menu result to one Reader. */
interface BibleMenuNavigationResultContext {
	/** Reader location copied into views that operate on the current passage. */
	bibleLocationRef: string;
	/** Navigation API owned by the Reader entry receiving the menu result. */
	navigation: PaneNavigation;
	/** Defers mutations until the Reader is active after the menu pops. */
	whenActive:
		NavigationEntryContext['whenActive'];
}

/**
 * Handles a menu action returned to the owning Bible reader.
 *
 * The menu reports intent through backWithResult(). This helper owns the menu
 * semantics and waits for `bible.reader` to become active before changing the
 * Reader's sibling navigation or Pane layout.
 *
 * @param result - Navigation result returned by the overflow-actions view.
 * @param context - Current Reader location and navigation runtime.
 * @returns `true` when the result belongs to the Bible overflow menu.
 */
export function handleBibleMenuNavigationResult(
	result: NavigationStateValue,
	context: BibleMenuNavigationResultContext
): boolean {
	if (
		!isRecord(result) ||
		result.type !==
			BIBLE_NAVIGATION_RESULTS.MENU_ACTION ||
		!isBibleMenuAction(result.action)
	) {
		return false;
	}

	context.whenActive(() => {
		applyBibleMenuAction(
			result.action,
			context
		);
	});

	return true;
}

/** Applies one validated overflow-menu action to the owning Reader. */
function applyBibleMenuAction(
	action: BibleMenuAction,
	context: BibleMenuNavigationResultContext
): void {
	const {
		bibleLocationRef,
		navigation
	} = context;

	switch (action) {
		case BIBLE_MENU_ACTIONS.COPY_VERSES:
			navigation.pushView(
				BIBLE_VIEWS.COPY_VERSE,
				{ bibleLocationRef }
			);
			return;

		case BIBLE_MENU_ACTIONS.BROWSE_BOOKMARKS:
			navigation.pushModule(
				Modules.BOOKMARKS,
				BOOKMARKS_VIEWS.ROOT,
				{ returnBibleLocationToReader: true }
			);
			return;

		case BIBLE_MENU_ACTIONS.BIBLE_VERSION:
			navigation.pushView(
				BIBLE_VIEWS.VERSION,
				{}
			);
			return;

		case BIBLE_MENU_ACTIONS.SPLIT_VERTICAL:
			navigation.split(
				PaneSplit.VERTICAL,
				Modules.MODULES,
				MODULES_VIEWS.ROOT,
				{}
			);
			return;

		case BIBLE_MENU_ACTIONS.SPLIT_HORIZONTAL:
			navigation.split(
				PaneSplit.HORIZONTAL,
				Modules.MODULES,
				MODULES_VIEWS.ROOT,
				{}
			);
			return;

	}
}

/** Narrows serialized menu action values to the supported Reader actions. */
function isBibleMenuAction(
	value: unknown
): value is BibleMenuAction {
	return (
		value === BIBLE_MENU_ACTIONS.COPY_VERSES ||
		value === BIBLE_MENU_ACTIONS.BIBLE_VERSION ||
		value === BIBLE_MENU_ACTIONS.BROWSE_BOOKMARKS ||
		value === BIBLE_MENU_ACTIONS.SPLIT_VERTICAL ||
		value === BIBLE_MENU_ACTIONS.SPLIT_HORIZONTAL
	);
}

/** Returns whether an unknown navigation value is a non-array object. */
function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value)
	);
}

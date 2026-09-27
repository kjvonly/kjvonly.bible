import {
	Modules,
	MODULES_VIEWS,
	PaneSplit,
	type NavigationEntryContext,
	type NavigationStateValue,
	type PaneNavigation
} from '$lib/application';

import {
	NOTES_VIEWS
} from '$lib/domains/notes';

import {
	BIBLE_MENU_ACTIONS,
	BIBLE_NAVIGATION_RESULTS,
	BIBLE_VIEWS,
	type BibleMenuAction
} from '../../../models/bible-navigation.model';

import {
	SEARCH_VIEWS
} from '../../../models/search-navigation.model';

interface BibleMenuNavigationResultContext {
	bibleLocationRef: string;
	navigation: PaneNavigation;
	whenActive:
		NavigationEntryContext['whenActive'];
}

/**
 * Handles a menu action returned to the owning Bible reader.
 *
 * The menu reports intent through backWithResult(). This helper owns the menu
 * semantics and waits for bible.reader to become active before changing the
 * reader's sibling navigation or Pane layout.
 *
 * @returns true when the result belongs to the Bible menu.
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

		case BIBLE_MENU_ACTIONS.BIBLE_VERSION:
			navigation.pushView(
				BIBLE_VIEWS.VERSION,
				{}
			);
			return;

		case BIBLE_MENU_ACTIONS.SEARCH:
			navigation.pushModule(
				Modules.SEARCH,
				SEARCH_VIEWS.RESULTS,
				{}
			);
			return;

		case BIBLE_MENU_ACTIONS.NOTES:
			navigation.pushModule(
				Modules.NOTES,
				NOTES_VIEWS.ROOT,
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

		case BIBLE_MENU_ACTIONS.CLOSE:
			navigation.back();
	}
}

function isBibleMenuAction(
	value: unknown
): value is BibleMenuAction {
	return (
		value === BIBLE_MENU_ACTIONS.COPY_VERSES ||
		value === BIBLE_MENU_ACTIONS.BIBLE_VERSION ||
		value === BIBLE_MENU_ACTIONS.SEARCH ||
		value === BIBLE_MENU_ACTIONS.NOTES ||
		value === BIBLE_MENU_ACTIONS.SPLIT_VERTICAL ||
		value === BIBLE_MENU_ACTIONS.SPLIT_HORIZONTAL ||
		value === BIBLE_MENU_ACTIONS.CLOSE
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

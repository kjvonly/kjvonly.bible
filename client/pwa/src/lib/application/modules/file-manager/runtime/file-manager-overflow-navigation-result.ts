import {
	Modules
} from '../../../models/modules.model';
import {
	MODULES_VIEWS
} from '../../modules/modules-navigation.model';
import type {
	NavigationEntryContext
} from '../../../runtime/navigation/navigation-entry-context';
import {
	PaneSplit
} from '../../../runtime/pane/models/pane-split';
import type {
	NavigationStateValue
} from '../../../services/navigation.service';
import type {
	PaneNavigation
} from '../../../services/pane-navigation.service';

import {
	FILE_MANAGER_NAVIGATION_RESULTS,
	FILE_MANAGER_OVERFLOW_ACTIONS,
	type FileManagerOverflowAction
} from '../models/file-manager-navigation.model';

interface FileManagerOverflowNavigationResultContext {
	navigation: PaneNavigation;
	whenActive:
		NavigationEntryContext['whenActive'];
}

/**
 * Handles a FileManager overflow command returned by the full-page menu view.
 * The command runs only after Back has revealed the originating mounted entry.
 */
export function handleFileManagerOverflowNavigationResult(
	result: NavigationStateValue,
	context: FileManagerOverflowNavigationResultContext
): boolean {
	if (
		!isRecord(result) ||
		result.type !==
			FILE_MANAGER_NAVIGATION_RESULTS.OVERFLOW_ACTION ||
		!isFileManagerOverflowAction(
			result.action
		)
	) {
		return false;
	}

	context.whenActive(() =>
		applyFileManagerOverflowAction(
			result.action,
			context.navigation
		)
	);

	return true;
}

function applyFileManagerOverflowAction(
	action: FileManagerOverflowAction,
	navigation: PaneNavigation
): void {
	switch (action) {
		case FILE_MANAGER_OVERFLOW_ACTIONS.SPLIT_HORIZONTAL:
			navigation.split(
				PaneSplit.HORIZONTAL,
				Modules.MODULES,
				MODULES_VIEWS.ROOT,
				{}
			);
			return;

		case FILE_MANAGER_OVERFLOW_ACTIONS.SPLIT_VERTICAL:
			navigation.split(
				PaneSplit.VERTICAL,
				Modules.MODULES,
				MODULES_VIEWS.ROOT,
				{}
			);
	}
}

function isFileManagerOverflowAction(
	value: unknown
): value is FileManagerOverflowAction {
	return (
		value ===
			FILE_MANAGER_OVERFLOW_ACTIONS.SPLIT_HORIZONTAL ||
		value ===
			FILE_MANAGER_OVERFLOW_ACTIONS.SPLIT_VERTICAL
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

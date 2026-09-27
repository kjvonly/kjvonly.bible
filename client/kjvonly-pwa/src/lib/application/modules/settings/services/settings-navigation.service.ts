import type {
	NavigationViewState
} from '../../../services/navigation.service';

// DEFINITIONS
import { settingsDefinition } from '../definitions/settings.definition';
import {
	SETTINGS_VIEWS,
	type SettingsView
} from '../models/settings-navigation.model';
import type {
	SettingsCustomRowDefinition,
	SettingsGroupRowDefinition,
	SettingsPageID,
	SettingsRowID,
	SettingsSelectRowDefinition
} from '../models/settings-definition.model';

// RESOLVERS
import { findSettingsRow } from '../resolvers/settings-definition-resolver';

// SEARCH
import type { SettingsSearchEntry } from '../search/settings-search.model';

///////////////////////////////////////////////////////////////////////////////

export type SettingsNavigableRowDefinition =
	| SettingsGroupRowDefinition
	| SettingsSelectRowDefinition
	| SettingsCustomRowDefinition;

interface SettingsPaneNavigation {
	pushView(
		view: SettingsView,
		state: NavigationViewState
	): unknown;

	back(): void;
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Settings navigation facade over the Pane's flat navigation stack.
 *
 * Declarative Settings rows remain unaware of Pane navigation mechanics while
 * every Settings screen participates in the same mounted Pane history as the
 * rest of the application.
 */
export class SettingsNavigationService {
	constructor(
		private readonly navigation:
			SettingsPaneNavigation
	) {}

	/** Navigate to the destination represented by a declarative Settings row. */
	navigate(
		row: SettingsNavigableRowDefinition
	): void {
		switch (row.type) {
			case 'group':
				this.navigateToPage(row.pageID);
				return;
			case 'select':
				this.navigation.pushView(
					SETTINGS_VIEWS.SELECT,
					{
						rowID: row.id
					}
				);
				return;
			case 'custom':
				this.navigation.pushView(
					SETTINGS_VIEWS.CUSTOM,
					{
						rowID: row.id
					}
				);
		}
	}

	/** Navigate from a search result to its Settings destination. */
	navigateToSearchResult(
		result: SettingsSearchEntry
	): void {
		if (result.pageID === settingsDefinition.rootPageID) {
			const row = findSettingsRow(result.rowID);

			if (row && row.type !== 'toggle') {
				this.navigate(row);
			}

			return;
		}

		this.navigateToPage(
			result.pageID,
			result.rowID
		);
	}

	/** Navigate directly to a Settings page, optionally focusing one row. */
	navigateToPage(
		pageID: SettingsPageID,
		focusRowID?: SettingsRowID
	): void {
		this.navigation.pushView(
			SETTINGS_VIEWS.GROUP,
			{
				pageID,
				...(focusRowID ? { focusRowID } : {})
			}
		);
	}

	/** Pop the current Settings entry and reveal the preserved previous view. */
	back(): void {
		this.navigation.back();
	}
}

import type {
	NavigationComponent,
	NavigationService
} from '../../../services/navigation.service';

// DEFINITIONS
import { settingsDefinition } from '../definitions/settings.definition';
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

export interface SettingsNavigationComponents {
	group: NavigationComponent;
	select: NavigationComponent;
	custom: NavigationComponent;
}

export type SettingsNavigableRowDefinition =
	| SettingsGroupRowDefinition
	| SettingsSelectRowDefinition
	| SettingsCustomRowDefinition;

///////////////////////////////////////////////////////////////////////////////

/**
 * Module-local navigation facade for Settings views.
 *
 * Converts declarative navigable Settings rows into generic NavigationService
 * entries while keeping component selection out of the row renderer.
 */
export class SettingsNavigationService {
	constructor(
		private readonly navigationService: NavigationService,
		private readonly components: SettingsNavigationComponents
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
				this.navigationService.push({
					component: this.components.select,
					obj: {
						rowID: row.id
					}
				});
				return;
			case 'custom':
				this.navigationService.push({
					component: this.components.custom,
					obj: {
						rowID: row.id
					}
				});
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
		this.navigationService.push({
			component: this.components.group,
			obj: {
				pageID,
				...(focusRowID ? { focusRowID } : {})
			}
		});
	}

	/** Pop the current Settings view and reveal the preserved previous view. */
	back(): void {
		this.navigationService.pop();
	}
}

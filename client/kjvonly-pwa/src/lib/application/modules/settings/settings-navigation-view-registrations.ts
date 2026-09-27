import type {
	NavigationViewRegistration
} from '../../runtime/rendering/navigation-view-registry';

import {
	SETTINGS_VIEWS,
	type SettingsView
} from './models/settings-navigation.model';

import SettingsNavigationEntry from './settingsNavigationEntry.svelte';

/**
 * Settings-owned navigation views registered by the application composition root.
 */
export const settingsNavigationViewRegistrations:
	readonly NavigationViewRegistration<SettingsView>[] = [
		{
			view: SETTINGS_VIEWS.ROOT,
			component: SettingsNavigationEntry
		},
		{
			view: SETTINGS_VIEWS.GROUP,
			component: SettingsNavigationEntry
		},
		{
			view: SETTINGS_VIEWS.SELECT,
			component: SettingsNavigationEntry
		},
		{
			view: SETTINGS_VIEWS.CUSTOM,
			component: SettingsNavigationEntry
		}
	];

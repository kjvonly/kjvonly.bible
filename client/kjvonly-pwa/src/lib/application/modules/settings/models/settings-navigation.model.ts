import type {
	SettingsPageID,
	SettingsRowID
} from './settings-definition.model';

///////////////////////////////////////////////////////////////////////////////

export const SETTINGS_VIEWS = {
	ROOT: 'settings.root',
	GROUP: 'settings.group',
	SELECT: 'settings.select',
	CUSTOM: 'settings.custom'
} as const;

export type SettingsView =
	typeof SETTINGS_VIEWS[
		keyof typeof SETTINGS_VIEWS
	];

///////////////////////////////////////////////////////////////////////////////

export interface SettingsPageNavigationState {
	pageID: SettingsPageID;
	focusRowID?: SettingsRowID;
}

export interface SettingsRowNavigationState {
	rowID: SettingsRowID;
}

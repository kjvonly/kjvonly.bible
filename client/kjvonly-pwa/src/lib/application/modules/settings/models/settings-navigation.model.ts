import type {
	SettingsPageID,
	SettingsRowID
} from './settings-definition.model';

///////////////////////////////////////////////////////////////////////////////

export interface SettingsRootNavigationObject {
	onClose: () => void;
}

export interface SettingsPageNavigationObject {
	pageID: SettingsPageID;
	focusRowID?: SettingsRowID;
}

export interface SettingsChoiceNavigationObject {
	rowID: SettingsRowID;
}

export type SettingsNavigationObject =
	| SettingsRootNavigationObject
	| SettingsPageNavigationObject
	| SettingsChoiceNavigationObject;

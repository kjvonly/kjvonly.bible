import type {
	SettingsPageID,
	SettingsRowID
} from '../models/settings-definition.model';

///////////////////////////////////////////////////////////////////////////////

export interface SettingsSearchEntry {
	pageID: SettingsPageID;
	rowID: SettingsRowID;
	title: string;
	secondary?: string;
	pageTitle: string;
	sectionLabel?: string;
	searchableText: string;
}

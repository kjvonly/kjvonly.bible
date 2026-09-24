import {
	settingsDefinition
} from '../definitions/settings.definition';
import type {
	SettingsCustomRowDefinition,
	SettingsPageDefinition,
	SettingsPageID,
	SettingsRowDefinition,
	SettingsRowID,
	SettingsSelectRowDefinition
} from '../models/settings-definition.model';

///////////////////////////////////////////////////////////////////////////////

export function findSettingsPage(
	pageID: SettingsPageID
): SettingsPageDefinition | undefined {
	return settingsDefinition.pages.find(
		(page) => page.id === pageID
	);
}

/** Return a Settings page or fail when a configured destination is missing. */
export function requireSettingsPage(
	pageID: SettingsPageID
): SettingsPageDefinition {
	const page = findSettingsPage(pageID);

	if (!page) {
		throw new Error(`Settings page not found: ${pageID}`);
	}

	return page;
}

export function findSettingsRow(
	rowID: SettingsRowID
): SettingsRowDefinition | undefined {
	for (const page of settingsDefinition.pages) {
		for (const section of page.sections) {
			const row = section.rows.find(
				(candidate) => candidate.id === rowID
			);

			if (row) {
				return row;
			}
		}
	}

	return undefined;
}

export function requireSettingsSelectRow(
	rowID: SettingsRowID
): SettingsSelectRowDefinition {
	const row = findSettingsRow(rowID);

	if (row?.type !== 'select') {
		throw new Error(`Settings select row not found: ${rowID}`);
	}

	return row;
}

export function requireSettingsCustomRow(
	rowID: SettingsRowID
): SettingsCustomRowDefinition {
	const row = findSettingsRow(rowID);

	if (row?.type !== 'custom') {
		throw new Error(`Settings custom row not found: ${rowID}`);
	}

	return row;
}

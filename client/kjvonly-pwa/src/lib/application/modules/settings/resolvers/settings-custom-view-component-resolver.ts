import FontSize from '../fontSize.svelte';

import type { SettingsCustomViewID } from '../models/settings-definition.model';

///////////////////////////////////////////////////////////////////////////////

const SETTINGS_CUSTOM_VIEW_COMPONENTS = {
	'font-size': FontSize
} as const satisfies Record<SettingsCustomViewID, unknown>;

///////////////////////////////////////////////////////////////////////////////

export function resolveSettingsCustomViewComponent(
	viewID: SettingsCustomViewID
) {
	return SETTINGS_CUSTOM_VIEW_COMPONENTS[viewID];
}

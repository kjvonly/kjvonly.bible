import About from '../about.svelte';
import FontSize from '../fontSize.svelte';

import type { SettingsCustomViewID } from '../models/settings-definition.model';

///////////////////////////////////////////////////////////////////////////////

const SETTINGS_CUSTOM_VIEW_COMPONENTS = {
	'font-size': FontSize,
	about: About
} as const satisfies Record<SettingsCustomViewID, unknown>;

///////////////////////////////////////////////////////////////////////////////

export function resolveSettingsCustomViewComponent(
	viewID: SettingsCustomViewID
) {
	return SETTINGS_CUSTOM_VIEW_COMPONENTS[viewID];
}

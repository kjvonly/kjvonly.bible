import Bible from '$lib/components/svgs/bible.svelte';
import Colors from '$lib/components/svgs/colors.svelte';
import LightMode from '$lib/components/svgs/lightMode.svelte';
import PageHeader from '$lib/components/svgs/pageHeader.svelte';
import Paragraph from '$lib/components/svgs/paragraph.svelte';
import ShortText from '$lib/components/svgs/shortText.svelte';
import TextFormat from '$lib/components/svgs/textFormat.svelte';
import WidthFull from '$lib/components/svgs/widthFull.svelte';

import type {
	SettingsAccentID,
	SettingsIconID
} from '../models/settings-definition.model';

///////////////////////////////////////////////////////////////////////////////

const SETTINGS_ICON_COMPONENTS = {
	appearance: TextFormat,
	bible: Bible,
	'theme-mode': LightMode,
	'color-theme': Colors,
	'font-family': TextFormat,
	'font-size': TextFormat,
	'font-weight': ShortText,
	paragraphs: Paragraph,
	pericopes: PageHeader,
	'bible-version': Bible,
	'max-width': WidthFull
} as const satisfies Record<SettingsIconID, unknown>;

///////////////////////////////////////////////////////////////////////////////

const SETTINGS_ICON_ACCENT_CLASSES = {
	'vivid-b-500': 'text-vivid-b-500',
	'support-a-500': 'text-support-a-500'
} as const satisfies Record<SettingsAccentID, string>;

///////////////////////////////////////////////////////////////////////////////

export function resolveSettingsIconComponent(
	iconID: SettingsIconID
) {
	return SETTINGS_ICON_COMPONENTS[iconID];
}

/**
 * Resolves optional Settings icon accent metadata to a statically discoverable
 * Tailwind text-color class. Root rows define accents; nested rows omit them
 * and use the normal neutral icon color.
 */
export function resolveSettingsIconAccentClass(
	accent?: SettingsAccentID
): string {
	return accent
		? SETTINGS_ICON_ACCENT_CLASSES[accent]
		: 'text-neutral-700';
}

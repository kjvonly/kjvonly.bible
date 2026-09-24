import type {
	Settings
} from '../../../models/settings.model';

///////////////////////////////////////////////////////////////////////////////

/** Stable identifier for one navigable Settings page. */
export type SettingsPageID = string;

/** Stable identifier for one section within a Settings page. */
export type SettingsSectionID = string;

/** Stable globally unique identifier for one Settings row. */
export type SettingsRowID = string;

/** Semantic icon identifier resolved by the Settings icon component mapper. */
export type SettingsIconID =
	| 'appearance'
	| 'bible'
	| 'theme-mode'
	| 'color-theme'
	| 'font-family'
	| 'font-size'
	| 'font-weight'
	| 'paragraphs'
	| 'pericopes'
	| 'bible-version'
	| 'max-width';

/** Semantic root-icon accent identifier resolved to a static Tailwind class. */
export type SettingsAccentID =
	| 'vivid-b-500'
	| 'support-a-500';

/** Semantic custom-view identifier resolved by the Settings view mapper. */
export type SettingsCustomViewID =
	| 'font-size';

/** Semantic formatter identifier for dynamic secondary Settings text. */
export type SettingsValueFormatterID =
	| 'font-size';

///////////////////////////////////////////////////////////////////////////////

/** Keys on Settings whose values are boolean and can therefore back toggles. */
export type SettingsBooleanKey = {
	[K in keyof Settings]:
		Settings[K] extends boolean
			? K
			: never;
}[keyof Settings];

/** Union of every value type represented by the application Settings model. */
export type SettingsValue =
	Settings[keyof Settings];

///////////////////////////////////////////////////////////////////////////////

/**
 * Declarative description of the complete Settings information architecture.
 *
 * Renderers, search, and navigation derive their behavior from this registry
 * rather than maintaining separate page-specific configuration.
 */
export interface SettingsDefinition {
	rootPageID: SettingsPageID;
	pages: readonly SettingsPageDefinition[];
}

/** One navigable Settings screen composed of ordered sections. */
export interface SettingsPageDefinition {
	id: SettingsPageID;
	title: string;
	description?: string;
	sections: readonly SettingsSectionDefinition[];
}

/**
 * Ordered group of Settings rows. A section label starts a visible grouping;
 * unlabeled sections are valid when no heading is needed.
 */
export interface SettingsSectionDefinition {
	id: SettingsSectionID;
	label?: string;
	description?: string;
	rows: readonly SettingsRowDefinition[];
}

///////////////////////////////////////////////////////////////////////////////

/** Additional metadata used to discover a row through global Settings search. */
export interface SettingsSearchDefinition {
	keywords?: readonly string[];
	hidden?: boolean;
}

/** Semantic icon metadata kept independent from concrete Svelte components. */
export interface SettingsIconDefinition {
	name: SettingsIconID;
	accent?: SettingsAccentID;
}

/** Static secondary text or a value derived from the current Settings state. */
export type SettingsSecondaryDefinition =
	| string
	| SettingsDynamicSecondaryDefinition;

/** Describes secondary text sourced from one current Settings property. */
export interface SettingsDynamicSecondaryDefinition {
	setting: keyof Settings;
	formatter?: SettingsValueFormatterID;
}

///////////////////////////////////////////////////////////////////////////////

/** Display/search metadata shared by every Settings row type. */
export interface SettingsRowDefinitionBase {
	id: SettingsRowID;
	title: string;
	secondary?: SettingsSecondaryDefinition;
	icon?: SettingsIconDefinition;
	search?: SettingsSearchDefinition;
}

/** Navigable row whose destination is another declarative Settings page. */
export interface SettingsGroupRowDefinition
	extends SettingsRowDefinitionBase {
	type: 'group';
	pageID: SettingsPageID;
}

/** Boolean setting rendered with the generic Settings toggle control. */
export interface SettingsToggleRowDefinition
	extends SettingsRowDefinitionBase {
	type: 'toggle';
	setting: SettingsBooleanKey;
}

/** One selectable value shown by the reusable Settings choice page. */
export interface SettingsOptionDefinition<
	T extends SettingsValue =
		SettingsValue
> {
	id: string;
	label: string;
	secondary?: string;
	value: T;
}

/**
 * Select row for one concrete Settings key.
 *
 * Keeping the key generic preserves the relationship between the selected
 * option value and the type of the Settings property being updated.
 */
interface SettingsSelectRowDefinitionFor<
	K extends keyof Settings
> extends SettingsRowDefinitionBase {
	type: 'select';
	setting: K;
	options:
		readonly SettingsOptionDefinition<
			Settings[K]
		>[];
}

/** Generic select row whose option values remain correlated to its setting. */
export type SettingsSelectRowDefinition = {
	[K in keyof Settings]:
		SettingsSelectRowDefinitionFor<K>;
}[keyof Settings];

/** Navigable row backed by a specialized component resolved from `view`. */
export interface SettingsCustomRowDefinition
	extends SettingsRowDefinitionBase {
	type: 'custom';
	view: SettingsCustomViewID;
}

/** Every row shape understood by the generic Settings renderer/navigation. */
export type SettingsRowDefinition =
	| SettingsGroupRowDefinition
	| SettingsToggleRowDefinition
	| SettingsSelectRowDefinition
	| SettingsCustomRowDefinition;

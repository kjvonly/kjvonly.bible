// MODELS
import type {
	SettingsValue,
	SettingsValueFormatterID
} from '../models/settings-definition.model';

///////////////////////////////////////////////////////////////////////////////

export function formatSettingsValue(
	formatter: SettingsValueFormatterID,
	value: SettingsValue
): string {
	return SETTINGS_VALUE_FORMATTERS[formatter](value);
}

///////////////////////////////////////////////////////////////////////////////

const SETTINGS_VALUE_FORMATTERS: Record<
	SettingsValueFormatterID,
	(value: SettingsValue) => string
> = {
	'font-size': (value) => `${value} px`
};

export interface Settings {
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  colorTheme: string;
  isDarkTheme: boolean;
  showParagraphs: boolean;
  showPericopes: boolean;
  showBibleVersion: boolean;
  enableMaxWidth: boolean;
}

export function newSettings(): Settings {
  return {
    fontSize: 16,
    fontWeight: 400,
    fontFamily: 'sans',
    colorTheme: 'red',
    isDarkTheme: false,
    showParagraphs: false,
    showPericopes: false,
    showBibleVersion: false,
    enableMaxWidth: true
  };
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Normalize untrusted persisted Settings data into a complete Settings value.
 *
 * Browser storage can contain values written by older application versions,
 * partial objects, or manually corrupted data. Missing or wrong-typed fields
 * fall back independently so one bad setting does not prevent the rest of the
 * user's valid settings from being restored.
 */
export function normalizeSettings(
  value: unknown
): Settings {
  const defaults = newSettings();

  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    return defaults;
  }

  const settings =
    value as Record<string, unknown>;

  return {
    fontSize:
      normalizeFontSize(
        settings.fontSize,
        defaults.fontSize
      ),
    fontWeight:
      typeof settings.fontWeight === 'number'
      && Number.isFinite(settings.fontWeight)
        ? settings.fontWeight
        : defaults.fontWeight,
    fontFamily:
      normalizeString(
        settings.fontFamily,
        defaults.fontFamily
      ),
    colorTheme:
      normalizeString(
        settings.colorTheme,
        defaults.colorTheme
      ),
    isDarkTheme:
      normalizeBoolean(
        settings.isDarkTheme,
        defaults.isDarkTheme
      ),
    showParagraphs:
      normalizeBoolean(
        settings.showParagraphs,
        defaults.showParagraphs
      ),
    showPericopes:
      normalizeBoolean(
        settings.showPericopes,
        defaults.showPericopes
      ),
    showBibleVersion:
      normalizeBoolean(
        settings.showBibleVersion,
        defaults.showBibleVersion
      ),
    enableMaxWidth:
      normalizeBoolean(
        settings.enableMaxWidth,
        defaults.enableMaxWidth
      )
  };
}

///////////////////////////////////////////////////////////////////////////////

function normalizeString(
  value: unknown,
  fallback: string
): string {
  return typeof value === 'string'
    && value.length > 0
    ? value
    : fallback;
}

///////////////////////////////////////////////////////////////////////////////

function normalizeBoolean(
  value: unknown,
  fallback: boolean
): boolean {
  return typeof value === 'boolean'
    ? value
    : fallback;
}

///////////////////////////////////////////////////////////////////////////////

function normalizeFontSize(
  value: unknown,
  fallback: number
): number {
  if (
    typeof value === 'number'
    && Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === 'string'
    && value.trim().length > 0
  ) {
    const numericValue =
      Number(value);

    if (
      Number.isFinite(numericValue)
    ) {
      return numericValue;
    }
  }

  return fallback;
}

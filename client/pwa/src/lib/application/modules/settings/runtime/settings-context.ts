import {
    getContext,
    setContext
} from 'svelte';

import type {
    Settings
} from '../../../models/settings.model';

///////////////////////////////////////////////////////////////////////////////

/**
 * Module-local reactive view of application settings.
 *
 * Each mounted Settings module owns its own context instance. Consumers read
 * from the local reactive `settings` object and persist user changes through
 * `update()`. The application SettingsService broadcasts persisted changes so
 * every mounted Settings module can refresh its local copy.
 */
export interface SettingsContext {
    settings: Settings;

    /**
     * Persist a single settings change through the application SettingsService.
     * The local reactive settings object is refreshed by the service broadcast.
     */
    update<K extends keyof Settings>(
        setting: K,
        value: Settings[K]
    ): void;
}

///////////////////////////////////////////////////////////////////////////////

const SETTINGS_CONTEXT =
    Symbol(
        'kjvonly.settings-context'
    );

///////////////////////////////////////////////////////////////////////////////

/**
 * Provide the Settings context for one mounted Settings module instance.
 */
export function provideSettingsContext(
    context:
        SettingsContext
): void {

    setContext(
        SETTINGS_CONTEXT,
        context
    );
}

///////////////////////////////////////////////////////////////////////////////

/**
 * Return the nearest Settings module context in the current Svelte tree.
 */
export function useSettingsContext():
    SettingsContext {

    const context =
        getContext<
            SettingsContext |
            undefined
        >(
            SETTINGS_CONTEXT
        );

    if (
        context ===
        undefined
    ) {
        throw new Error(
            'Settings context is not available.'
        );
    }

    return context;
}

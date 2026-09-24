import {
    type Settings,
    newSettings,
    normalizeSettings
} from '$lib/application/models/settings.model';

///////////////////////////////////////////////////////////////////////////////

/**
 * Receives the complete normalized Settings value whenever application
 * settings are applied.
 */
export type SettingsSubscriber =
    (settings: Settings) => void;

///////////////////////////////////////////////////////////////////////////////

/**
 * Application-owned settings capability.
 *
 * Settings are currently persisted in browser localStorage and applied to the
 * application DOM. Subscribers are notified with the complete Settings object
 * whenever settings are applied so each consumer can select the settings it
 * cares about. Settings persistence is owned here as well, keeping browser
 * storage details out of Svelte components.
 */
export class SettingsService {

    private readonly subscribers =
        new Map<
            string,
            SettingsSubscriber
        >();

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Register an application-wide settings subscriber.
     *
     * Subscriber IDs must be unique per mounted consumer. Registering the same
     * ID again replaces the previous subscriber.
     */
    subscribe(
        subscriberID: string,
        subscriber: SettingsSubscriber
    ): void {

        this.subscribers.set(
            subscriberID,
            subscriber
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Remove a previously registered settings subscriber.
     */
    unsubscribe(
        subscriberID: string
    ): void {

        this.subscribers.delete(
            subscriberID
        );
    }

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Persist one Settings value using the latest application Settings as the
     * merge base. This avoids rebuilding a complete Settings object from a
     * module-local reactive copy that may be older than the persisted state.
     */
    updateSetting<K extends keyof Settings>(
        setting: K,
        value: Settings[K]
    ): void {

        this.updateSettings({
            ...this.getSettings(),
            [setting]: value
        });
    }

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Persist a complete Settings value, then apply the persisted value to the
     * application and notify subscribers.
     *
     * The re-read is intentional: it preserves the previous Settings UI
     * behavior where localStorage was written first and applySettings() then
     * read the stored value before updating the DOM/subscribers.
     */
    updateSettings(
        settings: Settings
    ): void {

        const normalizedSettings =
            normalizeSettings(
                settings
            );

        localStorage.setItem(
            'settings',
            JSON.stringify(
                normalizedSettings
            )
        );

        this.applySettings();
    }

    ///////////////////////////////////////////////////////////////////////////

    applySettings(): void {

        const settings =
            this.getSettings();

        const html =
            document.getElementById(
                'kjvonly-html'
            );

        if (
            settings.isDarkTheme
        ) {
            html?.setAttribute(
                'data-theme',
                `color-theme-dark-${settings.colorTheme}`
            );
        } else {
            html?.setAttribute(
                'data-theme',
                `color-theme-${settings.colorTheme}`
            );
        }

        html?.setAttribute(
            'font-family',
            settings.fontFamily
        );

        html?.setAttribute(
            'style',
            `font-size: ${settings.fontSize}px; font-weight: ${settings.fontWeight};`
        );

        for (
            const subscriber
            of this.subscribers.values()
        ) {
            subscriber(
                settings
            );
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    getSettings(): Settings {

        const stored =
            localStorage.getItem(
                'settings'
            );

        if (
            stored !== null
        ) {
            try {
                return normalizeSettings(
                    JSON.parse(
                        stored
                    )
                );
            } catch {
                return newSettings();
            }
        }

        return newSettings();
    }
}

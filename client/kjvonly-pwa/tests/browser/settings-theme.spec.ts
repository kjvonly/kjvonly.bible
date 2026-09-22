import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	newSettings
} from '$lib/application/models/settings.model';

import {
	SettingsService
} from '$lib/application/services/settings.service';

const SETTINGS_STORAGE_KEY =
	'settings';

const APPLICATION_HTML_ID =
	'kjvonly-html';

describe(
	'Settings theme browser integration',
	() => {
		let html:
			HTMLDivElement;

		beforeEach(
			() => {
				localStorage.removeItem(
					SETTINGS_STORAGE_KEY
				);

				html =
					document.createElement(
						'div'
					);

				html.id =
					APPLICATION_HTML_ID;

				document.body.appendChild(
					html
				);
			}
		);

		afterEach(
			() => {
				html.remove();

				localStorage.removeItem(
					SETTINGS_STORAGE_KEY
				);
			}
		);

		it(
			'persists and applies the Night Colorblind light selector',
			() => {
				const settingsService =
					new SettingsService();

				const settings = {
					...newSettings(),
					colorTheme:
						'night-colorblind'
				};

				settingsService.updateSettings(
					settings
				);

				expect(
					html.getAttribute(
						'data-theme'
					)
				).toBe(
					'color-theme-night-colorblind'
				);

				expect(
					JSON.parse(
						localStorage.getItem(
							SETTINGS_STORAGE_KEY
						) ?? '{}'
					).colorTheme
				).toBe(
					'night-colorblind'
				);
			}
		);

		it(
			'restores and applies the Night Colorblind dark selector',
			() => {
				const settings = {
					...newSettings(),
					colorTheme:
						'night-colorblind',
					isDarkTheme:
						true
				};

				localStorage.setItem(
					SETTINGS_STORAGE_KEY,
					JSON.stringify(
						settings
					)
				);

				const settingsService =
					new SettingsService();

				settingsService.applySettings();

				expect(
					html.getAttribute(
						'data-theme'
					)
				).toBe(
					'color-theme-dark-night-colorblind'
				);

				expect(
					settingsService
						.getSettings()
						.isDarkTheme
				).toBe(true);
			}
		);
	}
);

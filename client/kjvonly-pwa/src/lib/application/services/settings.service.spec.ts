import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	type Settings
} from '$lib/application/models/settings.model';

import {
	SettingsService
} from './settings.service';

describe(
	'SettingsService',
	() => {
		let values:
			Map<string, string>;

		let html:
			{
				setAttribute:
					ReturnType<typeof vi.fn>;
			};

		let settingsService:
			SettingsService;

		beforeEach(
			() => {
				values =
					new Map();

				vi.stubGlobal(
					'localStorage',
					{
						getItem:
							(key: string) =>
								values.get(key) ?? null,

						setItem:
							(key: string, value: string) => {
								values.set(key, value);
							}
					}
				);

				html = {
					setAttribute:
						vi.fn()
				};

				vi.stubGlobal(
					'document',
					{
						getElementById:
							() => html
					}
				);

				settingsService =
					new SettingsService();
			}
		);

		afterEach(
			() => {
				vi.unstubAllGlobals();
			}
		);

		it(
			'normalizes partial persisted Settings with defaults',
			() => {
				values.set(
					'settings',
					JSON.stringify(
						{
							fontFamily:
								'serif',
							isDarkTheme:
								true
						}
					)
				);

				expect(
					settingsService.getSettings()
				).toEqual(
					{
						fontSize:
							16,
						fontWeight:
							400,
						fontFamily:
							'serif',
						colorTheme:
							'red',
						isDarkTheme:
							true,
						showParagraphs:
							false,
						showPericopes:
							false,
						showBibleVersion:
							false,
						enableMaxWidth:
							true
					}
				);
			}
		);

		it(
			'normalizes legacy persisted font sizes',
			() => {
				values.set(
					'settings',
					JSON.stringify(
						{
							fontSize:
								'18'
						}
					)
				);

				expect(
					settingsService
						.getSettings()
						.fontSize
				).toBe(18);

				values.set(
					'settings',
					JSON.stringify(
						{
							fontSize:
								'text-base'
						}
					)
				);

				expect(
					settingsService
						.getSettings()
						.fontSize
				).toBe(16);
			}
		);

		it(
			'falls back to default Settings when persisted JSON is malformed',
			() => {
				values.set(
					'settings',
					'{not-json'
				);

				expect(
					settingsService.getSettings()
				).toEqual(
					{
						fontSize:
							16,
						fontWeight:
							400,
						fontFamily:
							'sans',
						colorTheme:
							'red',
						isDarkTheme:
							false,
						showParagraphs:
							false,
						showPericopes:
							false,
						showBibleVersion:
							false,
						enableMaxWidth:
							true
					}
				);
			}
		);

		it(
			'normalizes Settings before persisting an update',
			() => {
				settingsService.updateSettings(
					{
						fontFamily:
							'serif',
						isDarkTheme:
							true
					} as Settings
				);

				expect(
					JSON.parse(
						values.get('settings') ?? ''
					)
				).toEqual(
					{
						fontSize:
							16,
						fontWeight:
							400,
						fontFamily:
							'serif',
						colorTheme:
							'red',
						isDarkTheme:
							true,
						showParagraphs:
							false,
						showPericopes:
							false,
						showBibleVersion:
							false,
						enableMaxWidth:
							true
					}
				);
			}
		);

		it(
			'persists, applies, and publishes a Settings update',
			() => {
				const settings:
					Settings = {
						fontSize:
							18,
						fontWeight:
							700,
						fontFamily:
							'serif',
						colorTheme:
							'purple',
						isDarkTheme:
							true,
						showParagraphs:
							true,
						showPericopes:
							false,
						showBibleVersion:
							true,
						enableMaxWidth:
							false
					};

				const subscriber =
					vi.fn();

				settingsService.subscribe(
					'test-subscriber',
					subscriber
				);

				settingsService.updateSettings(
					settings
				);

				expect(
					JSON.parse(
						values.get('settings') ?? ''
					)
				).toEqual(
					settings
				);

				expect(
					html.setAttribute
				).toHaveBeenCalledWith(
					'data-theme',
					'color-theme-dark-purple'
				);

				expect(
					html.setAttribute
				).toHaveBeenCalledWith(
					'font-family',
					'serif'
				);

				expect(
					html.setAttribute
				).toHaveBeenCalledWith(
					'style',
					'font-size: 18px; font-weight: 700;'
				);

				expect(
					subscriber
				).toHaveBeenCalledWith(
					settings
				);
			}
		);
	}
);

import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	SETTINGS_VIEWS
} from '../models/settings-navigation.model';
import {
	findSettingsRow,
	requireSettingsCustomRow,
	requireSettingsSelectRow
} from '../resolvers/settings-definition-resolver';
import {
	SettingsNavigationService
} from './settings-navigation.service';

///////////////////////////////////////////////////////////////////////////////

function createService() {
	const pushView = vi.fn();
	const back = vi.fn();

	return {
		pushView,
		back,
		settingsNavigationService:
			new SettingsNavigationService({
				pushView,
				back
			})
	};
}

///////////////////////////////////////////////////////////////////////////////

describe(
	'SettingsNavigationService',
	() => {
		it(
			'navigates group rows to their page',
			() => {
				const {
					pushView,
					settingsNavigationService
				} = createService();

				const row = findSettingsRow('appearance');

				if (row?.type !== 'group') {
					throw new Error('Appearance group row not found.');
				}

				settingsNavigationService.navigate(row);

				expect(pushView).toHaveBeenCalledWith(
					SETTINGS_VIEWS.GROUP,
					{
						pageID: 'appearance'
					}
				);
			}
		);

		it(
			'navigates select rows to the shared choice page',
			() => {
				const {
					pushView,
					settingsNavigationService
				} = createService();

				const row = requireSettingsSelectRow('font-family');

				settingsNavigationService.navigate(row);

				expect(pushView).toHaveBeenCalledWith(
					SETTINGS_VIEWS.SELECT,
					{
						rowID: 'font-family'
					}
				);
			}
		);

		it(
			'navigates custom rows to the shared custom page',
			() => {
				const {
					pushView,
					settingsNavigationService
				} = createService();

				const row = requireSettingsCustomRow('font-size');

				settingsNavigationService.navigate(row);

				expect(pushView).toHaveBeenCalledWith(
					SETTINGS_VIEWS.CUSTOM,
					{
						rowID: 'font-size'
					}
				);
			}
		);

		it(
			'navigates root search results through their row destination',
			() => {
				const {
					pushView,
					settingsNavigationService
				} = createService();

				settingsNavigationService.navigateToSearchResult({
					pageID: 'settings',
					rowID: 'appearance',
					title: 'Appearance',
					pageTitle: 'Settings',
					searchableText: 'appearance'
				});

				expect(pushView).toHaveBeenCalledWith(
					SETTINGS_VIEWS.GROUP,
					{
						pageID: 'appearance'
					}
				);
			}
		);

		it(
			'navigates nested search results to a focused row',
			() => {
				const {
					pushView,
					settingsNavigationService
				} = createService();

				settingsNavigationService.navigateToSearchResult({
					pageID: 'bible',
					rowID: 'show-pericopes',
					title: 'Pericopes',
					pageTitle: 'Bible',
					searchableText: 'pericopes'
				});

				expect(pushView).toHaveBeenCalledWith(
					SETTINGS_VIEWS.GROUP,
					{
						pageID: 'bible',
						focusRowID: 'show-pericopes'
					}
				);
			}
		);

		it(
			'navigates directly to a focused settings row',
			() => {
				const {
					pushView,
					settingsNavigationService
				} = createService();

				settingsNavigationService.navigateToPage(
					'bible',
					'show-pericopes'
				);

				expect(pushView).toHaveBeenCalledWith(
					SETTINGS_VIEWS.GROUP,
					{
						pageID: 'bible',
						focusRowID: 'show-pericopes'
					}
				);
			}
		);

		it(
			'navigates back through the Pane stack',
			() => {
				const {
					back,
					settingsNavigationService
				} = createService();

				settingsNavigationService.back();

				expect(back).toHaveBeenCalledOnce();
			}
		);
	}
);

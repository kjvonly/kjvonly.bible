import {
	get
} from 'svelte/store';
import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NavigationComponent
} from '../../../services/navigation.service';
import {
	NavigationService
} from '../../../services/navigation.service';
import {
	findSettingsRow,
	requireSettingsCustomRow,
	requireSettingsSelectRow
} from '../resolvers/settings-definition-resolver';
import {
	SettingsNavigationService
} from './settings-navigation.service';

///////////////////////////////////////////////////////////////////////////////

const GroupComponent = (() => undefined) as unknown as NavigationComponent;
const SelectComponent = (() => undefined) as unknown as NavigationComponent;
const CustomComponent = (() => undefined) as unknown as NavigationComponent;

function createService(): {
	navigationService: NavigationService;
	settingsNavigationService: SettingsNavigationService;
} {
	const navigationService = new NavigationService();

	return {
		navigationService,
		settingsNavigationService: new SettingsNavigationService(
			navigationService,
			{
				group: GroupComponent,
				select: SelectComponent,
				custom: CustomComponent
			}
		)
	};
}

///////////////////////////////////////////////////////////////////////////////

describe(
	'SettingsNavigationService',
	() => {
		it(
			'navigates group rows to their page',
			() => {
				const { navigationService, settingsNavigationService } = createService();
				const row = findSettingsRow('appearance');

				if (row?.type !== 'group') {
					throw new Error('Appearance group row not found.');
				}

				settingsNavigationService.navigate(row);

				expect(get(navigationService.views)).toEqual([
					{
						component: GroupComponent,
						obj: {
							pageID: 'appearance'
						}
					}
				]);
			}
		);

		it(
			'navigates select rows to the shared choice page',
			() => {
				const { navigationService, settingsNavigationService } = createService();
				const row = requireSettingsSelectRow('font-family');

				settingsNavigationService.navigate(row);

				expect(get(navigationService.views)[0]).toEqual({
					component: SelectComponent,
					obj: {
						rowID: 'font-family'
					}
				});
			}
		);

		it(
			'navigates custom rows to the shared custom page',
			() => {
				const { navigationService, settingsNavigationService } = createService();
				const row = requireSettingsCustomRow('font-size');

				settingsNavigationService.navigate(row);

				expect(get(navigationService.views)[0]).toEqual({
					component: CustomComponent,
					obj: {
						rowID: 'font-size'
					}
				});
			}
		);

		it(
			'navigates root search results through their row destination',
			() => {
				const { navigationService, settingsNavigationService } = createService();

				settingsNavigationService.navigateToSearchResult({
					pageID: 'settings',
					rowID: 'appearance',
					title: 'Appearance',
					pageTitle: 'Settings',
					searchableText: 'appearance'
				});

				expect(get(navigationService.views)[0]).toEqual({
					component: GroupComponent,
					obj: {
						pageID: 'appearance'
					}
				});
			}
		);

		it(
			'navigates nested search results to a focused row',
			() => {
				const { navigationService, settingsNavigationService } = createService();

				settingsNavigationService.navigateToSearchResult({
					pageID: 'bible',
					rowID: 'show-pericopes',
					title: 'Pericopes',
					pageTitle: 'Bible',
					searchableText: 'pericopes'
				});

				expect(get(navigationService.views)[0]).toEqual({
					component: GroupComponent,
					obj: {
						pageID: 'bible',
						focusRowID: 'show-pericopes'
					}
				});
			}
		);

		it(
			'navigates directly to a focused settings row',
			() => {
				const { navigationService, settingsNavigationService } = createService();

				settingsNavigationService.navigateToPage(
					'bible',
					'show-pericopes'
				);

				expect(get(navigationService.views)[0]).toEqual({
					component: GroupComponent,
					obj: {
						pageID: 'bible',
						focusRowID: 'show-pericopes'
					}
				});
			}
		);

		it(
			'pops the current navigation view when navigating back',
			() => {
				const { navigationService, settingsNavigationService } = createService();

				settingsNavigationService.navigateToPage('appearance');
				settingsNavigationService.navigateToPage('bible');
				settingsNavigationService.back();

				expect(get(navigationService.views)).toHaveLength(1);
				expect(get(navigationService.views)[0].obj).toEqual({
					pageID: 'appearance'
				});
			}
		);
	}
);

import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	Modules
} from '../../models/modules.model';

import type {
	NavigationState
} from '../../services/navigation.service';

import {
	PaneSplit
} from './models/pane-split';

import {
	PaneNavigationSplitter
} from './pane-navigation-splitter';

describe(
	'PaneNavigationSplitter',
	() => {
		it(
			'persists the complete initial navigation stack for the new Pane',
			() => {
				const splitPaneWithState =
					vi.fn(
						() => ({
							newPaneID:
								'pane-b'
						})
					);

				const splitter =
					new PaneNavigationSplitter({
						splitPaneWithState
					});

				const modulesState:
					NavigationState = {
						module:
							Modules.MODULES,
						view:
							'modules.root',
						state: {}
					};

				const navigationState:
					NavigationState = {
						module:
							Modules.BIBLE,
						view:
							'bible.reader',
						state: {
							bibleLocationRef:
								'43_3_16'
						}
					};

				const result =
					splitter.split(
						'pane-a',
						PaneSplit.VERTICAL,
						[
							modulesState,
							navigationState
						]
					);

				const paneState =
					splitPaneWithState.mock.calls[0]?.[2];


				const persistedNavigation =
					paneState?.navigation as NavigationState[];

				expect(
					persistedNavigation
				).toEqual([
					modulesState,
					navigationState
				]);

				expect(
					persistedNavigation[0]
				).toBe(
					modulesState
				);
				expect(
					persistedNavigation[1]
				).toBe(
					navigationState
				);

				expect(
					splitPaneWithState
				).toHaveBeenCalledWith(
					'pane-a',
					PaneSplit.VERTICAL,
					paneState
				);

				expect(result).toEqual({
					newPaneID:
						'pane-b'
				});
			}
		);

		it(
			'forwards a failed Workspace split while retaining navigation state',
			() => {
				const splitPaneWithState =
					vi.fn(
						() => undefined
					);

				const splitter =
					new PaneNavigationSplitter({
						splitPaneWithState
					});

				const navigationState:
					NavigationState = {
						module:
							Modules.STRONGS,
						view:
							'strongs.entry',
						state: {
							strongsRef:
								'G25'
						}
					};

				expect(
					splitter.split(
						'pane-a',
						PaneSplit.HORIZONTAL,
						[navigationState]
					)
				).toBeUndefined();

				const paneState =
					splitPaneWithState.mock.calls[0]?.[2];

				expect(
					paneState?.navigation
				).toEqual([
					navigationState
				]);
			}
		);
	}
);

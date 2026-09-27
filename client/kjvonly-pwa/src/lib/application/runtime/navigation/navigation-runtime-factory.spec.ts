import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	get
} from 'svelte/store';

import {
	Modules
} from '../../models/modules.model';

import type {
	ResourceSelections
} from '../../resources/resource-selections';

import {
	NavigationStateBuilder
} from '../../services/navigation-state-builder';

import type {
	NavigationComponent,
	NavigationState
} from '../../services/navigation.service';

import type {
	PaneState
} from '../pane/models/pane-state.model';

import type {
	Pane
} from '../pane/models/pane.model';

import {
	restorePane,
	serializePane
} from '../pane/persistence/pane-persistence';

import {
	PaneSplit
} from '../pane/models/pane-split';

import {
	NavigationViewRegistry
} from '../rendering/navigation-view-registry';

import {
	NavigationViewResolver
} from '../rendering/navigation-view-resolver';

import {
	NavigationRuntimeFactory,
	type NavigationInitialDestination
} from './navigation-runtime-factory';

const View =
	(() => undefined) as unknown as NavigationComponent;

describe(
	'NavigationRuntimeFactory',
	() => {
		it(
			'creates an isolated navigation runtime for each Pane',
			() => {
				const paneAState:
					PaneState = {};

				const paneBState:
					PaneState = {};

				const factory =
					createFactory({
						'pane-a': paneAState,
						'pane-b': paneBState
					});

				const paneA =
					factory.create(
						'pane-a'
					);

				const paneB =
					factory.create(
						'pane-b'
					);

				paneA.navigation.pushModule(
					Modules.PLANS,
					'plans.list',
					{}
				);

				expect(
					paneA.navigation.paneID
				).toBe('pane-a');
				expect(
					get(paneA.navigation.views)
				).toHaveLength(2);
				expect(
					get(paneB.navigation.views)
				).toHaveLength(1);
				expect(
					paneAState.navigation
				).toHaveLength(2);
				expect(
					paneBState.navigation
				).toHaveLength(1);
			}
		);

		it(
			'delegates split destinations through the Pane navigation splitter',
			() => {
				const split =
					vi.fn(
						() => ({
							newPaneID:
								'pane-b'
						})
					);

				const factory =
					createFactory(
						{
							'pane-a': {}
						},
						{ split }
					);

				const paneA =
					factory.create(
						'pane-a'
					);

				paneA.navigation.pushModule(
					Modules.PLANS,
					'plans.list',
					{}
				);

				const destination =
					paneA.navigation.split(
						PaneSplit.HORIZONTAL,
						Modules.BIBLE,
						'bible.reader',
						{
							bibleLocationRef:
								'43_3_16'
						}
					);

				expect(
					split
				).toHaveBeenCalledWith(
					'pane-a',
					PaneSplit.HORIZONTAL,
					[
						{
							module: Modules.MODULES,
							view: 'modules.root',
							state: {}
						},
						destination
					]
				);

				expect(
					get(
						paneA.navigation.views
					)
				).toHaveLength(2);
			}
		);


		it(
			'binds Pane close to Workspace deletion for the current Pane',
			() => {
				const deletePane =
					vi.fn(
						() => ({
							deletedPaneID:
								'pane-a'
						})
					);

				const factory =
					createFactory(
						{
							'pane-a': {}
						},
						{ deletePane }
					);

				const runtime =
					factory.create(
						'pane-a'
					);

				expect(
					runtime.navigation.closePane()
				).toBe(true);

				expect(
					deletePane
				).toHaveBeenCalledWith(
					'pane-a'
				);
			}
		);

		it(
			'initializes fresh navigation when persisted navigation is absent',
			() => {
				const paneState:
					PaneState = {};

				const createInitialDestinations =
					vi.fn(
						() => ([
							{
								module:
									Modules.MODULES,
								view:
									'modules.root',
								state: {}
							},
							{
								module:
									Modules.LOGIN,
								view:
									'login.root',
								state: {}
							}
						])
					);

				const factory =
					createFactory(
						{
							'pane-a': paneState
						},
						{
							createInitialDestinations
						}
					);

				const runtime =
					factory.create(
						'pane-a'
					);

				expect(
					createInitialDestinations
				).toHaveBeenCalledOnce();
				expect(
					get(runtime.navigation.views)
				).toHaveLength(2);
				expect(
					paneState.navigation
				).toHaveLength(2);

				const navigationStates =
					paneState.navigation as
						NavigationState[];

				expect(
					navigationStates[0]?.view
				).toBe('modules.root');
				expect(
					navigationStates[1]?.view
				).toBe('login.root');
			}
		);

		it(
			'rejects fresh navigation that does not begin with modules.root',
			() => {
				const paneState:
					PaneState = {};

				const factory =
					createFactory(
						{
							'pane-a': paneState
						},
						{
							createInitialDestinations:
								() => ([
									{
										module:
											Modules.PLANS,
										view:
											'plans.list',
										state: {}
									}
								])
						}
					);

				expect(
					() => factory.create(
						'pane-a'
					)
				).toThrow(
					'Initial Pane navigation must begin with modules.root'
				);

				expect(
					paneState.navigation
				).toBeUndefined();
			}
		);

		it(
			'restores independent navigation stacks for multiple persisted Panes',
			() => {
				const root: Pane = {
					id: undefined,
					split: PaneSplit.VERTICAL,
					left: {
						id: 'pane-a',
						state: {
							navigation: [
								{
									module: Modules.MODULES,
									view: 'modules.root',
									state: {}
								},
								{
									module: Modules.BIBLE,
									view: 'bible.reader',
									state: {
										bibleLocationRef: '43_3_16'
									}
								}
							]
						},
						left: undefined,
						right: undefined,
						split: undefined
					},
					right: {
						id: 'pane-b',
						state: {
							navigation: [
								{
									module: Modules.MODULES,
									view: 'modules.root',
									state: {}
								},
								{
									module: Modules.PLANS,
									view: 'plans.list',
									state: {
										filter: 'active'
									}
								}
							]
						},
						left: undefined,
						right: undefined,
						split: undefined
					},
					state: undefined
				};

				const restored =
					restorePane(
						JSON.parse(
							JSON.stringify(
								serializePane(
									root
								)
							)
						)
					);

				const paneAState =
					requirePaneState(
						restored.left,
						'pane-a'
					);
				const paneBState =
					requirePaneState(
						restored.right,
						'pane-b'
					);

				const factory =
					createFactory({
						'pane-a': paneAState,
						'pane-b': paneBState
					});

				const paneA =
					factory.create(
						'pane-a'
					);
				const paneB =
					factory.create(
						'pane-b'
					);

				const paneAViews =
					get(
						paneA.navigation.views
					);
				const paneBViews =
					get(
						paneB.navigation.views
					);

				expect(
					paneAViews.map(
						(view) =>
							view.navigationState.view
					)
				).toEqual([
					'modules.root',
					'bible.reader'
				]);
				expect(
					paneBViews.map(
						(view) =>
							view.navigationState.view
					)
				).toEqual([
					'modules.root',
					'plans.list'
				]);

				expect(
					paneAViews[1]?.navigationState.state
						.bibleLocationRef
				).toBe('43_3_16');
				expect(
					paneBViews[1]?.navigationState.state
						.filter
				).toBe('active');

				paneA.navigation.pushModule(
					Modules.PLANS,
					'plans.list',
					{
						filter: 'completed'
					}
				);

				expect(
					get(
						paneA.navigation.views
					)
				).toHaveLength(3);
				expect(
					get(
						paneB.navigation.views
					)
				).toHaveLength(2);
				expect(
					paneAState.navigation
				).toHaveLength(3);
				expect(
					paneBState.navigation
				).toHaveLength(2);
			}
		);

		it(
			'hydrates persisted generic navigation from the Pane state',
			() => {
				const rootNavigationState = {
					module: Modules.MODULES,
					view: 'modules.root',
					state: {}
				};

				const navigationState = {
					module: Modules.PLANS,
					view: 'plans.list',
					state: {}
				};

				const createInitialDestinations =
					vi.fn(
						() => ([
							{
								module:
									Modules.MODULES,
								view:
									'modules.root',
								state: {}
							}
						])
					);

				const factory =
					createFactory(
						{
							'pane-a': {
								navigation: [
									rootNavigationState,
									navigationState
								]
							}
						},
						{
							createInitialDestinations
						}
					);

				const runtime =
					factory.create(
						'pane-a'
					);

				const views =
					get(runtime.navigation.views);

				expect(
					createInitialDestinations
				).not.toHaveBeenCalled();
				expect(views).toHaveLength(2);
				expect(views[1]?.component).toBe(View);
				expect(
					views[1]?.navigationState
				).toBe(navigationState);
			}
		);

		it(
			'rejects a rendered Pane without persisted state',
			() => {
				const createInitialDestinations =
					vi.fn(
						() => ([
							{
								module:
									Modules.MODULES,
								view:
									'modules.root',
								state: {}
							}
						])
					);

				const factory =
					createFactory(
						{
							'pane-a': undefined
						},
						{
							createInitialDestinations
						}
					);

				expect(
					() => factory.create(
						'pane-a'
					)
				).toThrow(
					'Navigation Pane state is not available: pane-a'
				);

				expect(
					createInitialDestinations
				).not.toHaveBeenCalled();
			}
		);

		it(
			'reinitializes when persisted navigation contains an unregistered view',
			() => {
				const paneState:
					PaneState = {
					navigation: [
						{
							module:
								Modules.MODULES,
							view:
								'modules.root',
							state: {}
						},
						{
							module:
								Modules.PLANS,
							view:
								'plans.removed',
							state: {}
						}
					]
				};

				const createInitialDestinations =
					vi.fn(
						() => ([
							{
								module:
									Modules.MODULES,
								view:
									'modules.root',
								state: {}
							},
							{
								module:
									Modules.LOGIN,
								view:
									'login.root',
								state: {}
							}
						])
					);

				const factory =
					createFactory(
						{
							'pane-a': paneState
						},
						{
							createInitialDestinations
						}
					);

				const runtime =
					factory.create(
						'pane-a'
					);

				expect(
					createInitialDestinations
				).toHaveBeenCalledOnce();

				expect(
					get(runtime.navigation.views)
						.map(
							(view) =>
								view.navigationState.view
						)
				).toEqual([
					'modules.root',
					'login.root'
				]);

				expect(
					(paneState.navigation as NavigationState[])
						.map(
							(state) => state.view
						)
				).toEqual([
					'modules.root',
					'login.root'
				]);
			}
		);

		it(
			'rejects an unregistered fresh destination before persisting navigation',
			() => {
				const paneState:
					PaneState = {};

				const factory =
					createFactory(
						{
							'pane-a': paneState
						},
						{
							createInitialDestinations:
								() => ([
									{
										module:
											Modules.MODULES,
										view:
											'modules.root',
										state: {}
									},
									{
										module:
											Modules.LOGIN,
										view:
											'login.removed',
										state: {}
									}
								])
						}
					);

				expect(
					() => factory.create(
						'pane-a'
					)
				).toThrow(
					'Initial Pane navigation view is not registered: login.removed'
				);

				expect(
					paneState.navigation
				).toBeUndefined();
			}
		);
	}
);

function createFactory(
	paneStates:
		Record<
			string,
			PaneState | undefined
		>,
	overrides: {
		split?: (
			paneID: string,
			split: PaneSplit,
			navigationState: NavigationState
		) => { newPaneID: string } | undefined;
		createInitialDestinations?:
			() => readonly NavigationInitialDestination[];
		deletePane?: (
			paneID: string
		) => { deletedPaneID: string } | undefined;
	} = {}
): NavigationRuntimeFactory {
	const registry =
		new NavigationViewRegistry();

	registry.registerAll([
		{
			view: 'plans.list',
			component: View
		},
		{
			view: 'bible.reader',
			component: View
		},
		{
			view: 'modules.root',
			component: View
		},
		{
			view: 'login.root',
			component: View
		}
	]);

	const selections = {
		independent: () => ({}),
		related: (
			_module: Modules,
			originatingSelections:
				ResourceSelections
		) => originatingSelections,
		update: (
			_module: Modules,
			originatingSelections:
				ResourceSelections
		) => originatingSelections
	};

	return new NavigationRuntimeFactory(
		new NavigationStateBuilder(
			selections
		),
		new NavigationViewResolver(
			registry
		),
		selections,
		{
			findPane: (
				paneID: string
			) => {
				if (
					!Object.prototype
						.hasOwnProperty.call(
							paneStates,
							paneID
						)
				) {
					return undefined;
				}

				return {
					state:
						paneStates[paneID]
				};
			},
			persistWorkspace:
				vi.fn(),
			deletePane:
				overrides.deletePane ??
				(() => undefined)
		},
		{
			split:
				overrides.split ??
					(() => undefined)
		},
		overrides.createInitialDestinations ??
			(() => ([
				{
					module: Modules.MODULES,
					view: 'modules.root',
					state: {}
				}
			]))
	);
}


function requirePaneState(
	pane: Pane | undefined,
	paneID: string
): PaneState {
	if (
		pane?.id !== paneID ||
		pane.state === undefined
	) {
		throw new Error(
			`Expected restored Pane state: ${paneID}`
		);
	}

	return pane.state;
}

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
							view.obj.navigationState.view
					)
				).toEqual([
					'modules.root',
					'bible.reader'
				]);
				expect(
					paneBViews.map(
						(view) =>
							view.obj.navigationState.view
					)
				).toEqual([
					'modules.root',
					'plans.list'
				]);

				expect(
					paneAViews[1]?.obj.navigationState.state
						.bibleLocationRef
				).toBe('43_3_16');
				expect(
					paneBViews[1]?.obj.navigationState.state
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
				expect(views).toHaveLength(1);
				expect(views[0]?.component).toBe(View);
				expect(
					views[0]?.obj.navigationState
				).toBe(navigationState);
			}
		);
	}
);

function createFactory(
	paneStates:
		Record<string, PaneState>,
	overrides: {
		split?: (
			paneID: string,
			split: PaneSplit,
			navigationState: NavigationState
		) => { newPaneID: string } | undefined;
		createInitialDestinations?:
			() => readonly NavigationInitialDestination[];
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
				const state =
					paneStates[paneID];

				return state
					? { state }
					: undefined;
			},
			persistWorkspace:
				vi.fn()
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

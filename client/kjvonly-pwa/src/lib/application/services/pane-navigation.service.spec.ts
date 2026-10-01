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
} from '../models/modules.model';

import {
	PaneSplit
} from '../runtime/pane/models/pane-split';

import type {
	ResourceSelections
} from '../resources/resource-selections';

import type {
	PaneState
} from '../runtime/pane/models/pane-state.model';

import {
	NavigationStatePersistence
} from '../runtime/navigation/navigation-state-persistence';

import {
	NavigationViewRegistry
} from '../runtime/rendering/navigation-view-registry';

import {
	NavigationViewResolver
} from '../runtime/rendering/navigation-view-resolver';

import type {
	NavigationComponent,
	NavigationState
} from './navigation.service';

import {
	NavigationService
} from './navigation.service';

import {
	NavigationStateBuilder
} from './navigation-state-builder';

import {
	PaneNavigationService
} from './pane-navigation.service';

const PlansList =
	(() => undefined) as unknown as NavigationComponent;

const PlansDetails =
	(() => undefined) as unknown as NavigationComponent;

const BibleReader =
	(() => undefined) as unknown as NavigationComponent;

const ModulesLauncher =
	(() => undefined) as unknown as NavigationComponent;

const SOURCE = {
	publisher: 'publisher',
	resourceId: 'test/source'
};

const TARGET = {
	publisher: 'publisher',
	resourceId: 'test/target'
};

const RESOURCE_TYPE =
	'test/resource';

describe(
	'PaneNavigationService',
	() => {
		it(
			'pushes Module views into one flat Pane stack',
			() => {
				const independent =
					vi.fn(
						() => ({
							[RESOURCE_TYPE]: SOURCE
						})
					);

				const related =
					vi.fn(
						(
							_module: Modules,
							selections: ResourceSelections
						) => selections
					);

				const navigation =
					createNavigation({
						independent,
						related
					});

				const plans =
					navigation.pushModule(
						Modules.PLANS,
						'plans.list',
						{}
					);

				const bible =
					navigation.pushModule(
						Modules.BIBLE,
						'bible.reader',
						{
							bibleLocationRef:
								'John 3:16'
						}
					);

				expect(
					get(navigation.views)
				).toEqual([
					{
						component: PlansList,
						navigationState: plans
					},
					{
						component: BibleReader,
						navigationState: bible
					}
				]);

				expect(
					related
				).toHaveBeenCalledWith(
					Modules.BIBLE,
					expect.objectContaining({
						[RESOURCE_TYPE]: SOURCE
					})
				);
			}
		);

		it(
			'pushes another view using the active Module and Resource state',
			() => {
				const related =
					vi.fn(
						(
							_module: Modules,
							selections: ResourceSelections
						) => selections
					);

				const navigation =
					createNavigation({
						independent:
							() => ({
								[RESOURCE_TYPE]: SOURCE
							}),
						related
					});

				navigation.pushModule(
					Modules.PLANS,
					'plans.list',
					{}
				);

				const details =
					navigation.pushView(
						'plans.details',
						{
							planID: 'plan-1'
						}
					);

				expect(details).toEqual({
					module: Modules.PLANS,
					view: 'plans.details',
					state: {
						planID: 'plan-1',
						resourceSelections: {
							[RESOURCE_TYPE]: SOURCE
						}
					}
				});

				expect(
					related
				).toHaveBeenCalledWith(
					Modules.PLANS,
					expect.objectContaining({
						[RESOURCE_TYPE]: SOURCE
					})
				);
			}
		);

		it(
			'updates Resource selections on only the active navigation state',
			() => {
				const update =
					vi.fn(
						() => ({
							[RESOURCE_TYPE]: TARGET
						})
					);

				const navigation =
					createNavigation({
						independent:
							() => ({
								[RESOURCE_TYPE]: SOURCE
							}),
						related:
							(
								_module,
								selections
							) => selections,
						update
					});

				const first =
					navigation.pushModule(
						Modules.PLANS,
						'plans.list',
						{}
					);

				const second =
					navigation.pushView(
						'plans.details',
						{
							planID: 'plan-1'
						}
					);

				navigation.updateResourceSelection(
					RESOURCE_TYPE,
					TARGET
				);

				expect(
					first.state.resourceSelections
				).toEqual({
					[RESOURCE_TYPE]: SOURCE
				});

				expect(
					second.state.resourceSelections
				).toEqual({
					[RESOURCE_TYPE]: TARGET
				});

				expect(update).toHaveBeenCalledWith(
					Modules.PLANS,
					expect.objectContaining({
						[RESOURCE_TYPE]: SOURCE
					}),
					RESOURCE_TYPE,
					TARGET
				);
			}
		);

		it(
			'hydrates registered runtime views from persisted navigation state without replacing the state objects',
			() => {
				const navigation =
					createNavigation();

				const plans = {
					module: Modules.PLANS,
					view: 'plans.list',
					state: {}
				};

				const details = {
					module: Modules.PLANS,
					view: 'plans.details',
					state: {
						planID: 'plan-1'
					}
				};

				navigation.hydrate([
					plans,
					details
				]);

				const views =
					get(navigation.views);

				expect(views).toHaveLength(2);
				expect(views[0]?.component).toBe(PlansList);
				expect(views[1]?.component).toBe(PlansDetails);
				expect(
					views[0]?.navigationState
				).toBe(plans);
				expect(
					views[1]?.navigationState
				).toBe(details);
			}
		);


		it(
			'keeps persisted NavigationState objects in sync with push, update, and Back',
			() => {
				const paneState:
					PaneState = {};

				const persistWorkspace =
					vi.fn();

				const navigation =
					createNavigation({
						paneState,
						persistWorkspace,
						independent:
							() => ({
								[RESOURCE_TYPE]: SOURCE
							}),
						related:
							(
								_module,
								selections
							) => selections,
						update:
							() => ({
								[RESOURCE_TYPE]: TARGET
							})
					});

				const modules =
					navigation.pushModule(
						Modules.MODULES,
						'modules.root',
						{}
					);

				const first =
					navigation.pushModule(
						Modules.PLANS,
						'plans.list',
						{}
					);

				const second =
					navigation.pushView(
						'plans.details',
						{
							planID: 'plan-1'
						}
					);

				const persisted =
					paneState.navigation as
						unknown[];

				expect(persisted[0]).toBe(modules);
				expect(persisted[1]).toBe(first);
				expect(persisted[2]).toBe(second);

				navigation.updateResourceSelection(
					RESOURCE_TYPE,
					TARGET
				);

				expect(
					second.state.resourceSelections
				).toEqual({
					[RESOURCE_TYPE]: TARGET
				});

				navigation.back();

				expect(
					paneState.navigation
				).toEqual([
					modules,
					first
				]);
				expect(
					persistWorkspace
				).toHaveBeenCalledTimes(5);
			}
		);

		it(
			'creates Modules then a related destination in a new Pane without changing the current stack',
			() => {
				const paneState:
					PaneState = {};

				const splitPane =
					vi.fn(
						() => true
					);

				const navigation =
					createNavigation({
						paneState,
						independent:
							(module) =>
								module === Modules.MODULES
									? {}
									: {
										[RESOURCE_TYPE]: SOURCE
									},
						related:
							(
								_module,
								selections
							) => selections,
						splitPane
					});

				const modules =
					navigation.pushModule(
						Modules.MODULES,
						'modules.root',
						{}
					);

				const plans =
					navigation.pushModule(
						Modules.PLANS,
						'plans.list',
						{}
					);

				const beforeViews =
					get(
						navigation.views
					);

				const bible =
					navigation.split(
						PaneSplit.VERTICAL,
						Modules.BIBLE,
						'bible.reader',
						{
							bibleLocationRef:
								'43_3_16'
						}
					);

				expect(bible).toEqual({
					module: Modules.BIBLE,
					view: 'bible.reader',
					state: {
						bibleLocationRef:
							'43_3_16',
						resourceSelections: {
							[RESOURCE_TYPE]: SOURCE
						}
					}
				});

				expect(
					splitPane
				).toHaveBeenCalledWith(
					PaneSplit.VERTICAL,
					[
						{
							module: Modules.MODULES,
							view: 'modules.root',
							state: {}
						},
						bible
					]
				);

				expect(
					get(navigation.views)
				).toEqual(
					beforeViews
				);

				expect(
					paneState.navigation
				).toEqual([
					modules,
					plans
				]);
			}
		);

		it(
			'creates only one Modules entry when splitting directly to Modules',
			() => {
				const splitPane =
					vi.fn(
						() => true
					);

				const navigation =
					createNavigation({
						splitPane
					});

				navigation.pushModule(
					Modules.PLANS,
					'plans.list',
					{}
				);

				const modules =
					navigation.split(
						PaneSplit.HORIZONTAL,
						Modules.MODULES,
						'modules.root',
						{}
					);

				expect(
					splitPane
				).toHaveBeenCalledWith(
					PaneSplit.HORIZONTAL,
					[modules]
				);
			}
		);

		it(
			'delegates Pane removal through the Pane navigation boundary',
			() => {
				const closePane =
					vi.fn(
						() => true
					);

				const navigation =
					createNavigation({
						closePane
					});

				expect(
					navigation.closePane()
				).toBe(true);

				expect(
					closePane
				).toHaveBeenCalledOnce();
			}
		);

		it(
			'escapes by closing the Pane without rewriting its navigation stack',
			() => {
				const paneState:
					PaneState = {};

				const closePane =
					vi.fn(
						() => true
					);

				const navigation =
					createNavigation({
						paneState,
						closePane
					});

				navigation.pushModule(
					Modules.MODULES,
					'modules.root',
					{}
				);

				navigation.pushModule(
					Modules.PLANS,
					'plans.list',
					{}
				);

				const before =
					[...get(navigation.views)];

				navigation.escapePane();

				expect(
					closePane
				).toHaveBeenCalledOnce();

				expect(
					get(navigation.views)
				).toEqual(before);
			}
		);

		it(
			'escapes the final Pane by replacing history with a fresh Modules root',
			() => {
				const paneState:
					PaneState = {};

				const persistWorkspace =
					vi.fn();

				const closePane =
					vi.fn(
						() => false
					);

				const navigation =
					createNavigation({
						paneState,
						persistWorkspace,
						closePane
					});

				const originalModules =
					navigation.pushModule(
						Modules.MODULES,
						'modules.root',
						{
							previous: true
						}
					);

				navigation.pushModule(
					Modules.PLANS,
					'plans.list',
					{}
				);

				navigation.escapePane();

				expect(
					closePane
				).toHaveBeenCalledOnce();

				const views =
					get(navigation.views);

				expect(views).toHaveLength(1);
				expect(
					views[0]?.component
				).toBe(ModulesLauncher);

				const freshModules =
					views[0]?.navigationState;

				expect(
					freshModules
				).toEqual({
					module: Modules.MODULES,
					view: 'modules.root',
					state: {}
				});

				expect(
					freshModules
				).not.toBe(
					originalModules
				);

				expect(
					paneState.navigation
				).toEqual([
					freshModules
				]);

				expect(
					persistWorkspace
				).toHaveBeenCalledTimes(3);
			}
		);

		it(
			'returns a result to the previous mounted entry before navigating back',
			async () => {
				const paneState:
					PaneState = {};

				const navigation =
					createNavigation({
						paneState
					});

				const modules =
					navigation.pushModule(
						Modules.MODULES,
						'modules.root',
						{}
					);

				const plans =
					navigation.pushModule(
						Modules.PLANS,
						'plans.list',
						{}
					);

				const resultHandler =
					vi.fn();

				navigation.onResult(
					plans,
					resultHandler
				);

				navigation.pushModule(
					Modules.BIBLE,
					'bible.reader',
					{}
				);

				const result = {
					type: 'plans.reading-completed',
					subID: 'sub-1',
					subNestedReadingsIndex: 2
				};

				await navigation.backWithResult(
					result
				);

				expect(
					resultHandler
				).toHaveBeenCalledWith(
					result
				);

				expect(
					get(navigation.views)
				).toHaveLength(2);

				expect(
					paneState.navigation
				).toEqual([
					modules,
					plans
				]);
			}
		);

		it(
			'keeps the active entry when a navigation result handler fails',
			async () => {
				const paneState:
					PaneState = {};

				const navigation =
					createNavigation({
						paneState
					});

				const modules =
					navigation.pushModule(
						Modules.MODULES,
						'modules.root',
						{}
					);

				const plans =
					navigation.pushModule(
						Modules.PLANS,
						'plans.list',
						{}
					);

				navigation.onResult(
					plans,
					async () => {
						throw new Error(
							'progress failed'
						);
					}
				);

				const bible =
					navigation.pushModule(
						Modules.BIBLE,
						'bible.reader',
						{}
					);

				await expect(
					navigation.backWithResult(
						'complete'
					)
				).rejects.toThrow(
					'progress failed'
				);

				expect(
					get(navigation.views)
				).toHaveLength(3);

				expect(
					paneState.navigation
				).toEqual([
					modules,
					plans,
					bible
				]);
			}
		);

		it(
			'keeps persistence aligned when a stack subscriber navigates during Back',
			() => {
				const paneState:
					PaneState = {};

				const navigation =
					createNavigation({
						paneState
					});

				const modules =
					navigation.pushModule(
						Modules.MODULES,
						'modules.root',
						{}
					);

				const plans =
					navigation.pushModule(
						Modules.PLANS,
						'plans.list',
						{}
					);

				navigation.pushView(
					'plans.details',
					{
						planID: 'plan-1'
					}
				);

				let handled = false;
				let bible:
					NavigationState | undefined;

				const unsubscribe =
					navigation.views.subscribe(
						(views) => {
							if (
								handled ||
								views.length !== 2 ||
								views[1]
									?.navigationState !==
									plans
							) {
								return;
							}

							handled = true;

							navigation.back();
							bible =
								navigation.pushModule(
									Modules.BIBLE,
									'bible.reader',
									{}
								);

						}
					);

				navigation.back();
				unsubscribe();

				const views =
					get(navigation.views);

				expect(
					views.map(
						(view) =>
							view.navigationState
					)
				).toEqual([
					modules,
					bible
				]);

				expect(
					paneState.navigation
				).toEqual([
					modules,
					bible
				]);
			}
		);

		it(
			'keeps the previous mounted entry when navigating back',
			() => {
				const navigation =
					createNavigation();

				navigation.pushModule(
					Modules.PLANS,
					'plans.list',
					{}
				);

				const firstView =
					get(
						navigation.views
					)[0];

				navigation.pushView(
					'plans.details',
					{
						planID: 'plan-1'
					}
				);

				navigation.back();

				const views =
					get(
						navigation.views
					);

				expect(views).toHaveLength(1);
				expect(views[0]).toBe(firstView);
			}
		);

	}
);

function createNavigation(
	overrides: {
		independent?: (
			module: Modules
		) => ResourceSelections;
		related?: (
			module: Modules,
			selections: ResourceSelections
		) => ResourceSelections;
		update?: (
			module: Modules,
			selections: ResourceSelections,
			resourceType: string,
			value: typeof SOURCE
		) => ResourceSelections;
		paneState?: PaneState;
		persistWorkspace?: () => void;
		splitPane?: (
			split: PaneSplit,
			navigationState: NavigationState
		) => boolean;
		closePane?: () => boolean;
	} = {}
): PaneNavigationService {
	const registry =
		new NavigationViewRegistry();

	registry.registerAll([
		{
			view: 'plans.list',
			component: PlansList
		},
		{
			view: 'plans.details',
			component: PlansDetails
		},
		{
			view: 'bible.reader',
			component: BibleReader
		},
		{
			view: 'modules.root',
			component: ModulesLauncher
		}
	]);

	const resourceSelections = {
		independent:
			overrides.independent ??
			(() => ({})),
		related:
			overrides.related ??
			((_module, selections) => selections),
		update:
			overrides.update ??
			((_module, selections) => selections)
	};

	const persistence =
		overrides.paneState !== undefined ||
		overrides.persistWorkspace !== undefined
			? new NavigationStatePersistence(
				overrides.paneState ?? {},
				overrides.persistWorkspace ??
					(() => undefined)
			)
			: undefined;

	return new PaneNavigationService(
		'pane-1',
		new NavigationService(),
		new NavigationStateBuilder(
			resourceSelections
		),
		new NavigationViewResolver(
			registry
		),
		resourceSelections,
		persistence,
		overrides.splitPane,
		overrides.closePane
	);
}

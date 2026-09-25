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

import type {
	ResourceSelections
} from '../resources/resource-selections';

import type {
	BufferState
} from '../runtime/buffer/models/buffer-state.model';

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
	NavigationComponent
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
						obj: {
							navigationState: plans
						}
					},
					{
						component: BibleReader,
						obj: {
							navigationState: bible
						}
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
					views[0]?.obj.navigationState
				).toBe(plans);
				expect(
					views[1]?.obj.navigationState
				).toBe(details);
			}
		);


		it(
			'keeps persisted NavigationState objects in sync with push, update, and Back',
			() => {
				const bufferState:
					BufferState = {};

				const persistWorkspace =
					vi.fn();

				const navigation =
					createNavigation({
						bufferState,
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
					bufferState.navigation as
						unknown[];

				expect(persisted[0]).toBe(first);
				expect(persisted[1]).toBe(second);

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
					bufferState.navigation
				).toEqual([
					first
				]);
				expect(
					persistWorkspace
				).toHaveBeenCalledTimes(4);
			}
		);

		it(
			'reports whether the Pane has navigation history',
			() => {
				const navigation =
					createNavigation();

				navigation.pushModule(
					Modules.PLANS,
					'plans.list',
					{}
				);

				expect(
					navigation.canGoBack()
				).toBe(false);

				navigation.pushView(
					'plans.details',
					{ planID: 'plan-1' }
				);

				expect(
					navigation.canGoBack()
				).toBe(true);
			}
		);

		it(
			'updates semantic state on the supplied navigation entry and persists it',
			() => {
				const persistWorkspace =
					vi.fn();

				const navigation =
					createNavigation({
						persistWorkspace
					});

				const state =
					navigation.pushModule(
						Modules.BIBLE,
						'bible.reader',
						{}
					);

				navigation.updateViewState(
					state,
					'bibleLocationRef',
					'43_3_16'
				);

				expect(
					state.state.bibleLocationRef
				).toBe('43_3_16');

				expect(
					persistWorkspace
				).toHaveBeenCalledTimes(2);
			}
		);

		it(
			'returns a result to the previous mounted entry before navigating back',
			async () => {
				const bufferState:
					BufferState = {};

				const navigation =
					createNavigation({
						bufferState
					});

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
				).toHaveLength(1);

				expect(
					bufferState.navigation
				).toEqual([
					plans
				]);
			}
		);

		it(
			'keeps the active entry when a navigation result handler fails',
			async () => {
				const bufferState:
					BufferState = {};

				const navigation =
					createNavigation({
						bufferState
					});

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
				).toHaveLength(2);

				expect(
					bufferState.navigation
				).toEqual([
					plans,
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

		it(
			'identifies the active navigation state',
			() => {
				const navigation =
					createNavigation();

				const first =
					navigation.pushModule(
						Modules.PLANS,
						'plans.list',
						{}
					);

				expect(
					navigation.isActive(first)
				).toBe(true);

				const second =
					navigation.pushView(
						'plans.details',
						{
							planID: 'plan-1'
						}
					);

				expect(
					navigation.isActive(first)
				).toBe(false);
				expect(
					navigation.isActive(second)
				).toBe(true);
			}
		);

		it(
			'clears runtime and persisted navigation together',
			() => {
				const bufferState:
					BufferState = {};

				const persistWorkspace =
					vi.fn();

				const navigation =
					createNavigation({
						bufferState,
						persistWorkspace
					});

				navigation.pushModule(
					Modules.PLANS,
					'plans.list',
					{}
				);

				navigation.clear();

				expect(
					get(navigation.views)
				).toEqual([]);
				expect(
					bufferState.navigation
				).toBeUndefined();
				expect(
					persistWorkspace
				).toHaveBeenCalledTimes(2);
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
		bufferState?: BufferState;
		persistWorkspace?: () => void;
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
		new NavigationStatePersistence(
			overrides.bufferState ?? {},
			overrides.persistWorkspace ??
				(() => undefined)
		);

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
		persistence
	);
}

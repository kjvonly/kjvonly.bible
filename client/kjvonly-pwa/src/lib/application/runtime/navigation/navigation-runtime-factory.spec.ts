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
	NavigationServiceFactory
} from '../../services/navigation-service-factory';

import {
	NavigationStateBuilder
} from '../../services/navigation-state-builder';

import type {
	NavigationComponent
} from '../../services/navigation.service';

import type {
	BufferState
} from '../buffer/models/buffer-state.model';

import {
	NavigationViewRegistry
} from '../rendering/navigation-view-registry';

import {
	NavigationViewResolver
} from '../rendering/navigation-view-resolver';

import {
	NavigationRuntimeFactory
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
					BufferState = {};

				const paneBState:
					BufferState = {};

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

				expect(paneA.paneID).toBe(
					'pane-a'
				);
				expect(
					paneA.navigation.paneID
				).toBe('pane-a');
				expect(
					get(paneA.navigation.views)
				).toHaveLength(1);
				expect(
					get(paneB.navigation.views)
				).toHaveLength(0);
				expect(
					paneAState.navigation
				).toHaveLength(1);
				expect(
					paneBState.navigation
				).toBeUndefined();
			}
		);

		it(
			'hydrates persisted generic navigation from the Pane Buffer state',
			() => {
				const navigationState = {
					module: Modules.PLANS,
					view: 'plans.list',
					state: {}
				};

				const factory =
					createFactory({
						'pane-a': {
							navigation: [
								navigationState
							]
						}
					});

				const runtime =
					factory.create(
						'pane-a'
					);

				const views =
					get(runtime.navigation.views);

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
	bufferStates:
		Record<string, BufferState>
): NavigationRuntimeFactory {
	const registry =
		new NavigationViewRegistry();

	registry.register({
		view: 'plans.list',
		component: View
	});

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
		new NavigationServiceFactory(),
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
					bufferStates[paneID];

				return state
					? {
						buffer: {
							state
						}
					}
					: undefined;
			},
			persistWorkspace:
				vi.fn()
		}
	);
}

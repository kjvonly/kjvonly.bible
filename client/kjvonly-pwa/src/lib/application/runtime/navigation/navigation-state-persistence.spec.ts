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
	PaneState
} from '../pane/models/pane-state.model';

import {
	NavigationStatePersistence,
	parseNavigationStates
} from './navigation-state-persistence';

describe(
	'parseNavigationStates',
	() => {
		it(
			'restores the flat generic navigation stack without copying its entries',
			() => {
				const first = {
					module: Modules.MODULES,
					view: 'modules.root',
					state: {}
				};

				const second = {
					module: Modules.PLANS,
					view: 'plans.details',
					state: {
						planID: 'plan-1'
					}
				};

				const value = [
					first,
					second
				];

				const states =
					parseNavigationStates(
						value
					);

				expect(states).toBe(value);
				expect(states?.[0]).toBe(first);
				expect(states?.[1]).toBe(second);
			}
		);

		it(
			'treats navigation persisted before the Modules-root invariant as absent',
			() => {
				expect(
					parseNavigationStates([
						{
							module: Modules.PLANS,
							view: 'plans.list',
							state: {}
						}
					])
				).toBeUndefined();
			}
		);

		it(
			'treats pre-navigation persisted state as absent',
			() => {
				expect(
					parseNavigationStates([
						{
							view: 'plans.list',
							state: {}
						}
					])
				).toBeUndefined();
			}
		);

		it(
			'throws when a generic navigation stack contains an invalid entry',
			() => {
				expect(
					() => parseNavigationStates([
						{
							module: Modules.PLANS,
							view: 'plans.list',
							state: null
						}
					])
				).toThrow(
					'Invalid persisted navigation view state'
				);
			}
		);
	}
);

describe(
	'NavigationStatePersistence',
	() => {
		it(
			'appends the exact NavigationState object to Pane state',
			() => {
				const paneState:
					PaneState = {};

				const persistWorkspace =
					vi.fn();

				const persistence =
					new NavigationStatePersistence(
						paneState,
						persistWorkspace
					);

				const navigationState = {
					module: Modules.PLANS,
					view: 'plans.list',
					state: {}
				};

				persistence.append(
					navigationState
				);

				const states =
					paneState.navigation as
						unknown[];

				expect(states).toHaveLength(1);
				expect(states[0]).toBe(
					navigationState
				);
				expect(
					persistWorkspace
				).toHaveBeenCalledOnce();
			}
		);

		it(
			'replaces the persisted stack with one exact modules.root state',
			() => {
				const paneState:
					PaneState = {
						navigation: [
							{
								module: Modules.MODULES,
								view: 'modules.root',
								state: {}
							},
							{
								module: Modules.PLANS,
								view: 'plans.list',
								state: {}
							}
						]
					};

				const persistWorkspace =
					vi.fn();

				const persistence =
					new NavigationStatePersistence(
						paneState,
						persistWorkspace
					);

				const replacement = {
					module: Modules.MODULES,
					view: 'modules.root',
					state: {}
				};

				persistence.replaceWithRoot(
					replacement
				);

				const states =
					paneState.navigation as
						unknown[];

				expect(states).toHaveLength(1);
				expect(states[0]).toBe(
					replacement
				);
				expect(
					persistWorkspace
				).toHaveBeenCalledOnce();
			}
		);

		it(
			'rejects replacing the persisted stack with a non-root destination',
			() => {
				const persistence =
					new NavigationStatePersistence(
						{},
						vi.fn()
					);

				expect(() =>
					persistence.replaceWithRoot({
						module: Modules.PLANS,
						view: 'plans.list',
						state: {}
					})
				).toThrow(
					'Navigation replacement must use modules.root'
				);
			}
		);

		it(
			'pops only the newest persisted entry and preserves the root',
			() => {
				const first = {
					module: Modules.MODULES,
					view: 'modules.root',
					state: {}
				};

				const second = {
					module: Modules.PLANS,
					view: 'plans.details',
					state: {
						planID: 'plan-1'
					}
				};

				const navigation = [
					first,
					second
				];

				const persistWorkspace =
					vi.fn();

				const persistence =
					new NavigationStatePersistence(
						{ navigation },
						persistWorkspace
					);

				expect(
					persistence.pop()
				).toBe(true);
				expect(navigation).toEqual([
					first
				]);
				expect(
					persistence.pop()
				).toBe(false);
				expect(navigation).toEqual([
					first
				]);
				expect(
					persistWorkspace
				).toHaveBeenCalledOnce();
			}
		);

	}
);

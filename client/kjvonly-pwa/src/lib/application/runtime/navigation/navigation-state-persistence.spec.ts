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
					module: Modules.PLANS,
					view: 'plans.list',
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
			'pops only the newest persisted entry and preserves the root',
			() => {
				const first = {
					module: Modules.PLANS,
					view: 'plans.list',
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

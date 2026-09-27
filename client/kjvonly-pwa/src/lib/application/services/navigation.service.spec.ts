import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	Component
} from 'svelte';

import {
	get
} from 'svelte/store';

import {
	Modules
} from '../models/modules.model';

import {
	NavigationService,
	type NavigationState
} from './navigation.service';

const FirstView =
	(() => ({})) as unknown as Component;

const SecondView =
	(() => ({})) as unknown as Component;

describe(
	'NavigationService',
	() => {
		it(
			'hydrates a complete runtime stack without changing view identity',
			() => {
				const service =
					new NavigationService();

				const first = {
					component:
						FirstView,
					navigationState:
						createNavigationState('first')
				};

				const second = {
					component:
						SecondView,
					navigationState:
						createNavigationState('second')
				};

				service.hydrate([
					first,
					second
				]);

				const views =
					get(service.views);

				expect(views).toEqual([
					first,
					second
				]);
				expect(views[0]).toBe(first);
				expect(views[1]).toBe(second);
			}
		);

		it(
			'pushes views in navigation order',
			() => {
				const service =
					new NavigationService();

				const first = {
					component:
						FirstView,
					navigationState:
						createNavigationState('first')
				};

				const second = {
					component:
						SecondView,
					navigationState:
						createNavigationState('second')
				};

				service.push(
					first
				);

				service.push(
					second
				);

				const views =
					get(service.views);

				expect(views).toEqual([
					first,
					second
				]);
				expect(views[0]).toBe(first);
				expect(views[1]).toBe(second);
			}
		);

		it(
			'navigates back by popping only the newest view',
			() => {
				const service =
					new NavigationService();

				const first = {
					component:
						FirstView,
					navigationState:
						createNavigationState('root')
				};

				service.push(
					first
				);

				service.push({
					component:
						SecondView,
					navigationState:
						createNavigationState('child')
				});

				service.back();

				expect(
					get(service.views)
				).toEqual([
					first
				]);
			}
		);

		it(
			'keeps the root view when navigating back',
			() => {
				const service =
					new NavigationService();

				const root = {
					component:
						FirstView,
					navigationState:
						createNavigationState('root')
				};

				service.push(
					root
				);

				service.back();

				expect(
					get(service.views)
				).toEqual([
					root
				]);
			}
		);

	}
);

function createNavigationState(
	view: string
): NavigationState {
	return {
		module: Modules.MODULES,
		view,
		state: {}
	};
}

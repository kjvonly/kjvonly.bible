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
	NavigationService
} from './navigation.service';

const FirstView =
	(() => ({})) as unknown as Component;

const SecondView =
	(() => ({})) as unknown as Component;

describe(
	'NavigationService',
	() => {
		it(
			'pushes views in navigation order',
			() => {
				const service =
					new NavigationService();

				const first = {
					component:
						FirstView,
					obj: {
						id: 'first'
					}
				};

				const second = {
					component:
						SecondView,
					obj: {
						id: 'second'
					}
				};

				service.push(
					first
				);

				service.push(
					second
				);

				expect(
					get(service.views)
				).toEqual([
					first,
					second
				]);
			}
		);

		it(
			'pops only the newest view',
			() => {
				const service =
					new NavigationService();

				const first = {
					component:
						FirstView,
					obj: {}
				};

				service.push(
					first
				);

				service.push({
					component:
						SecondView,
					obj: {}
				});

				service.pop();

				expect(
					get(service.views)
				).toEqual([
					first
				]);
			}
		);

		it(
			'keeps an empty stack empty when popped',
			() => {
				const service =
					new NavigationService();

				service.pop();

				expect(
					get(service.views)
				).toEqual([]);
			}
		);
	}
);

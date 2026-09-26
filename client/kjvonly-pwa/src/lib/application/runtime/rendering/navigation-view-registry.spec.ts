import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NavigationComponent
} from '$lib/application/services/navigation.service';

import {
	NavigationViewRegistry
} from './navigation-view-registry';

const FirstView = (() => undefined) as unknown as NavigationComponent;
const SecondView = (() => undefined) as unknown as NavigationComponent;

describe(
	'NavigationViewRegistry',
	() => {
		it(
			'registers and resolves a namespaced view',
			() => {
				const registry =
					new NavigationViewRegistry();

				registry.register({
					view: 'plans.subscriptions',
					component: FirstView
				});

				expect(
					registry.require(
						'plans.subscriptions'
					)
				).toBe(FirstView);
			}
		);

		it(
			'keeps domain-spaced view IDs distinct',
			() => {
				const registry =
					new NavigationViewRegistry();

				registry.registerAll([
					{
						view: 'plans.details',
						component: FirstView
					},
					{
						view: 'bible.details',
						component: SecondView
					}
				]);

				expect(
					registry.require(
						'plans.details'
					)
				).toBe(FirstView);

				expect(
					registry.require(
						'bible.details'
					)
				).toBe(SecondView);
			}
		);

		it(
			'throws when a view is registered twice',
			() => {
				const registry =
					new NavigationViewRegistry();

				registry.register({
					view: 'plans.subscriptions',
					component: FirstView
				});

				expect(
					() => registry.register({
						view: 'plans.subscriptions',
						component: SecondView
					})
				).toThrow(
					'Navigation view already registered: plans.subscriptions'
				);
			}
		);

		it(
			'throws when a view is not registered',
			() => {
				const registry =
					new NavigationViewRegistry();

				expect(
					() => registry.require(
						'plans.subscriptions'
					)
				).toThrow(
					'Navigation view not registered: plans.subscriptions'
				);
			}
		);
	}
);

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	get
} from 'svelte/store';

import {
	NavigationServiceFactory
} from './navigation-service-factory';

describe(
	'NavigationServiceFactory',
	() => {
		it(
		'creates independent navigation services',
		() => {
			const factory =
				new NavigationServiceFactory();

			const first =
				factory.create();

			const second =
				factory.create();

			first.push({
				component:
					'first'
			});

			expect(
				get(first.views)
			).toHaveLength(1);

			expect(
				get(second.views)
			).toEqual([]);
		}
		);
	}
);

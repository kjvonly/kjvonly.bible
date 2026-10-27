import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NavigationComponent,
	NavigationState
} from '$lib/application/services/navigation.service';

import {
	Modules
} from '$lib/application/models/modules.model';

import {
	NavigationViewRegistry
} from './navigation-view-registry';

import {
	NavigationViewResolver
} from './navigation-view-resolver';

const View = (() => undefined) as unknown as NavigationComponent;

describe(
	'NavigationViewResolver',
	() => {
		it(
			'resolves through the registered view identity',
			() => {
				const registry =
					new NavigationViewRegistry();

				registry.register({
					view: 'plans.subscriptions',
					component: View
				});

				const resolver =
					new NavigationViewResolver(
						registry
					);

				const state:
					NavigationState = {
						module: Modules.PLANS,
						view: 'plans.subscriptions',
						state: {}
					};

				expect(
					resolver.resolve(state)
				).toBe(View);
			}
		);
	}
);

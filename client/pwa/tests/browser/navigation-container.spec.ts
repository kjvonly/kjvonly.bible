import {
	mount,
	tick,
	unmount
} from 'svelte';
import {
	describe,
	expect,
	it
} from 'vitest';

import {
	Modules
} from '$lib/application/models/modules.model';
import type {
	ResourceSelections
} from '$lib/application/resources/resource-selections';
import {
	NavigationStateBuilder
} from '$lib/application/services/navigation-state-builder';
import {
	PaneNavigationService
} from '$lib/application/services/pane-navigation.service';
import {
	NavigationService,
	type NavigationComponent
} from '$lib/application/services/navigation.service';
import {
	NavigationViewRegistry
} from '$lib/application/runtime/rendering/navigation-view-registry';
import {
	NavigationViewResolver
} from '$lib/application/runtime/rendering/navigation-view-resolver';

import NavigationContainerHost from './fixtures/navigation-container-host.svelte';
import PersistentNavigationView from './fixtures/persistent-navigation-view.svelte';

///////////////////////////////////////////////////////////////////////////////

function requireElement<T extends Element>(
	root: ParentNode,
	selector: string
): T {
	const element = root.querySelector<T>(selector);

	if (!element) {
		throw new Error(`Expected element matching ${selector}.`);
	}

	return element;
}

///////////////////////////////////////////////////////////////////////////////

describe(
	'PaneNavigationContainer',
	() => {
		it(
			'keeps previous views mounted and restores the same instance after Back',
			async () => {
				const target = document.createElement('div');
				document.body.appendChild(target);

				const navigation =
					createNavigation();

				navigation.pushModule(
					Modules.MODULES,
					'test.first',
					{ id: 'first' }
				);

				const navigationContainer = mount(
					NavigationContainerHost,
					{
						target,
						props: {
							navigation
						}
					}
				);

				try {
					await tick();

					const firstInput = requireElement<HTMLInputElement>(
						target,
						'[data-navigation-input="first"]'
					);

					firstInput.value = 'preserved';
					firstInput.dispatchEvent(
						new Event(
							'input',
							{
								bubbles: true
							}
						)
					);
					await tick();

					navigation.pushView(
						'test.second',
						{ id: 'second' }
					);
					await tick();

					const firstView = requireElement<HTMLElement>(
						target,
						'[data-navigation-view="first"]'
					);
					const secondView = requireElement<HTMLElement>(
						target,
						'[data-navigation-view="second"]'
					);

					expect(firstView.parentElement?.classList.contains('hidden')).toBe(true);
					expect(secondView.parentElement?.classList.contains('hidden')).toBe(false);

					navigation.back();
					await tick();

					const restoredInput = requireElement<HTMLInputElement>(
						target,
						'[data-navigation-input="first"]'
					);
					const restoredView = requireElement<HTMLElement>(
						target,
						'[data-navigation-view="first"]'
					);

					expect(restoredInput).toBe(firstInput);
					expect(restoredInput.value).toBe('preserved');
					expect(restoredView.parentElement?.classList.contains('hidden')).toBe(false);
					expect(
						target.querySelector('[data-navigation-view="second"]')
					).toBeNull();
				} finally {
					await unmount(navigationContainer);
					target.remove();
				}
			}
		);
	}
);

function createNavigation():
	PaneNavigationService {
	const component =
		PersistentNavigationView as
			NavigationComponent;

	const registry =
		new NavigationViewRegistry();

	registry.registerAll([
		{
			view: 'test.first',
			component
		},
		{
			view: 'test.second',
			component
		}
	]);

	const resourceSelections = {
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

	return new PaneNavigationService(
		'navigation-test-pane',
		new NavigationService(),
		new NavigationStateBuilder(
			resourceSelections
		),
		new NavigationViewResolver(
			registry
		),
		resourceSelections
	);
}

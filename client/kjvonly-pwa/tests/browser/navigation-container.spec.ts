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
	NavigationService,
	type NavigationComponent
} from '$lib/application/services/navigation.service';

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
	'NavigationContainer',
	() => {
		it(
			'keeps previous views mounted and restores the same instance after pop',
			async () => {
				const target = document.createElement('div');
				document.body.appendChild(target);

				const navigationService = new NavigationService();
				const component = PersistentNavigationView as NavigationComponent;

				navigationService.push({
					component,
					obj: {
						id: 'first'
					}
				});

				const navigationContainer = mount(
					NavigationContainerHost,
					{
						target,
						props: {
							navService: navigationService
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

					navigationService.push({
						component,
						obj: {
							id: 'second'
						}
					});
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

					navigationService.pop();
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

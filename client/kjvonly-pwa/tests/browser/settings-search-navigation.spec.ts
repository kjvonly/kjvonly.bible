import {
	mount,
	tick,
	unmount
} from 'svelte';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

import SettingsSearchNavigationHost from './fixtures/settings-search-navigation-host.svelte';

///////////////////////////////////////////////////////////////////////////////

function requireElement<T extends Element>(
	root: ParentNode,
	selector: string
): T {
	const element =
		root.querySelector<T>(
			selector
		);

	if (!element) {
		throw new Error(
			`Expected element matching ${selector}.`
		);
	}

	return element;
}

///////////////////////////////////////////////////////////////////////////////

function requireButtonByText(
	root: ParentNode,
	text: string
): HTMLButtonElement {
	const button =
		Array.from(
			root.querySelectorAll<HTMLButtonElement>(
				'button'
			)
		).find(
			(candidate) =>
				candidate.textContent
					?.trim()
					.includes(text)
		);

	if (!button) {
		throw new Error(
			`Expected button containing ${text}.`
		);
	}

	return button;
}

///////////////////////////////////////////////////////////////////////////////

describe(
	'Settings search navigation',
	() => {
		beforeEach(
			() => {
				localStorage.removeItem(
					'settings'
				);
			}
		);

		afterEach(
			() => {
				localStorage.removeItem(
					'settings'
				);
			}
		);

		it(
			'preserves the root search state after navigating to a result and back',
			async () => {
				const target =
					document.createElement(
						'div'
					);

				document.body.appendChild(
					target
				);

				const originalScrollIntoView =
					HTMLElement.prototype.scrollIntoView;

				HTMLElement.prototype.scrollIntoView =
					() => {};

				const component =
					mount(
						SettingsSearchNavigationHost,
						{
							target
						}
					);

				try {
					await tick();

					const searchInput =
						requireElement<HTMLInputElement>(
							target,
							'input[type="search"]'
						);

					searchInput.value =
						'pericopes';

					searchInput.dispatchEvent(
						new Event(
							'input',
							{
								bubbles: true
							}
						)
					);

					await tick();

					requireButtonByText(
						target,
						'Pericopes'
					).click();

					await tick();

					expect(
						requireButtonByText(
							target,
							'Back'
						)
					).toBeTruthy();

					requireButtonByText(
						target,
						'Back'
					).click();

					await tick();

					const restoredSearchInput =
						requireElement<HTMLInputElement>(
							target,
							'input[type="search"]'
						);

					expect(
						restoredSearchInput
					).toBe(searchInput);

					expect(
						restoredSearchInput.value
					).toBe('pericopes');

					expect(
						requireButtonByText(
							target,
							'Pericopes'
						)
					).toBeTruthy();
				} finally {
					HTMLElement.prototype.scrollIntoView =
						originalScrollIntoView;

					await unmount(
						component
					);

					target.remove();
				}
			}
		);
	}
);

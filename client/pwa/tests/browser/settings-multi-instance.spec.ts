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

import SettingsMultiInstanceHost from './fixtures/settings-multi-instance-host.svelte';

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

describe(
	'Settings multi-instance synchronization',
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
			'updates another mounted Settings module after a user change',
			async () => {
				const target =
					document.createElement(
						'div'
					);

				document.body.appendChild(
					target
				);

				const component =
					mount(
						SettingsMultiInstanceHost,
						{
							target
						}
					);

				try {
					await tick();

					const first =
						requireElement<HTMLElement>(
							target,
							'[data-settings-instance="first"]'
						);

					const second =
						requireElement<HTMLElement>(
							target,
							'[data-settings-instance="second"]'
						);

					requireElement<HTMLButtonElement>(
						first,
						'[data-settings-row-id="bible"] button'
					).click();

					requireElement<HTMLButtonElement>(
						second,
						'[data-settings-row-id="bible"] button'
					).click();

					await tick();

					const firstPericopes =
						requireElement<HTMLInputElement>(
							first,
							'[data-settings-row-id="show-pericopes"] input[type="checkbox"]'
						);

					const secondPericopes =
						requireElement<HTMLInputElement>(
							second,
							'[data-settings-row-id="show-pericopes"] input[type="checkbox"]'
						);

					expect(
						firstPericopes.checked
					).toBe(false);

					expect(
						secondPericopes.checked
					).toBe(false);

					firstPericopes.checked =
						true;

					firstPericopes.dispatchEvent(
						new Event(
							'change',
							{
								bubbles: true
							}
						)
					);

					await tick();

					expect(
						firstPericopes.checked
					).toBe(true);

					expect(
						secondPericopes.checked
					).toBe(true);

					expect(
						JSON.parse(
							localStorage.getItem(
								'settings'
							) ?? '{}'
						).showPericopes
					).toBe(true);
				} finally {
					await unmount(
						component
					);

					target.remove();
				}
			}
		);

		it(
			'toggles document progress from Reader settings in both mounted views',
			async () => {
				const target = document.createElement('div');
				document.body.appendChild(target);
				const component = mount(SettingsMultiInstanceHost, { target });
				try {
					await tick();
					const first = requireElement<HTMLElement>(target, '[data-settings-instance="first"]');
					const second = requireElement<HTMLElement>(target, '[data-settings-instance="second"]');
					requireElement<HTMLButtonElement>(first, '[data-settings-row-id="reader"] button').click();
					requireElement<HTMLButtonElement>(second, '[data-settings-row-id="reader"] button').click();
					await tick();
					const selector = '[data-settings-row-id="show-normalized-document-progress"] input[type="checkbox"]';
					const firstToggle = requireElement<HTMLInputElement>(first, selector);
					const secondToggle = requireElement<HTMLInputElement>(second, selector);
					expect(firstToggle.checked).toBe(false);
					expect(secondToggle.checked).toBe(false);
					firstToggle.checked = true;
					firstToggle.dispatchEvent(new Event('change', { bubbles: true }));
					await tick();
					expect(firstToggle.checked).toBe(true);
					expect(secondToggle.checked).toBe(true);
					expect(JSON.parse(localStorage.getItem('settings') ?? '{}')).toMatchObject({
						showNormalizedDocumentProgress: true,
						showBibleScrollbar: false
					});
					firstToggle.checked = false;
					firstToggle.dispatchEvent(new Event('change', { bubbles: true }));
					await tick();
					expect(firstToggle.checked).toBe(false);
					expect(secondToggle.checked).toBe(false);
				} finally {
					await unmount(component);
					target.remove();
				}
			}
		);
	}
);

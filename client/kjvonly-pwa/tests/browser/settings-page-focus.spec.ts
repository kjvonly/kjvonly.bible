import {
	mount,
	tick,
	unmount
} from 'svelte';
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import SettingsPageFocusHost from './fixtures/settings-page-focus-host.svelte';

///////////////////////////////////////////////////////////////////////////////

describe(
	'SettingsPage focus',
	() => {
		it(
			'scrolls to and pulses the focused row',
			async () => {
				const target = document.createElement('div');
				document.body.appendChild(target);

				const originalScrollIntoView =
					HTMLElement.prototype.scrollIntoView;
				const scrollIntoView = vi.fn();

				HTMLElement.prototype.scrollIntoView =
					scrollIntoView;

				const component = mount(
					SettingsPageFocusHost,
					{
						target,
						props: {
							focusRowID: 'focus-target'
						}
					}
				);

				try {
					await tick();
					await tick();

					const row = target.querySelector<HTMLElement>(
						'[data-settings-row-id="focus-target"]'
					);

					expect(row).not.toBeNull();
					expect(scrollIntoView).toHaveBeenCalledWith({
						behavior: expect.stringMatching(/^(auto|smooth)$/),
						block: 'center'
					});
					expect(row?.classList.contains('animate-pulse')).toBe(true);
					expect(row?.classList.contains('ring-2')).toBe(true);
					expect(row?.classList.contains('ring-primary-500')).toBe(true);
				} finally {
					await unmount(component);

					HTMLElement.prototype.scrollIntoView =
						originalScrollIntoView;
					target.remove();
				}
			}
		);
	}
);

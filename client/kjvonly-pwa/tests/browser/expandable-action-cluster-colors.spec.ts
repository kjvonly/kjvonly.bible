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

import ExpandableActionClusterColorsHost from './fixtures/expandable-action-cluster-colors-host.svelte';

function requireElement<T extends Element>(
	root: ParentNode,
	selector: string
): T {
	const element = root.querySelector<T>(selector);

	if (!element) {
		throw new Error(
			`Expected element matching ${selector}.`
		);
	}

	return element;
}

describe(
	'KJVExpandableActionCluster colors',
	() => {
		it(
			'keeps the selected color on top, then expands, selects, and collapses',
			async () => {
				const target = document.createElement('div');
				document.body.appendChild(target);

				const component = mount(
					ExpandableActionClusterColorsHost,
					{ target }
				);

				try {
					await tick();

					let expandButton =
						requireElement<HTMLButtonElement>(
							target,
							'[aria-label="expand colors"]'
						);
					let collapsedSwatches =
						expandButton.querySelectorAll<HTMLElement>(
							'[data-color-swatch]'
						);

					expect(
						collapsedSwatches[0]?.dataset.colorSwatch
					).toBe('c');

					expandButton.click();
					await tick();

					const colorE =
						requireElement<HTMLButtonElement>(
							target,
							'[aria-label="select color e"]'
						);
					colorE.click();
					await tick();

					expect(
						requireElement<HTMLElement>(
							target,
							'[data-selected-color]'
						).textContent
					).toBe('e');

					expandButton =
						requireElement<HTMLButtonElement>(
							target,
							'[aria-label="expand colors"]'
						);
					collapsedSwatches =
						expandButton.querySelectorAll<HTMLElement>(
							'[data-color-swatch]'
						);

					expect(
						collapsedSwatches[0]?.dataset.colorSwatch
					).toBe('e');
				} finally {
					await unmount(component);
					target.remove();
				}
			}
		);
	}
);

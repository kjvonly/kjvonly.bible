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

import ExpandableActionClusterHost from './fixtures/expandable-action-cluster-host.svelte';

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
	'KJVExpandableActionCluster',
	() => {
		it(
			'expands compact actions, runs a selected action, and collapses again',
			async () => {
				const target =
					document.createElement('div');
				document.body.appendChild(target);

				const component = mount(
					ExpandableActionClusterHost,
					{ target }
				);

				try {
					await tick();

					const expandButton =
						requireElement<HTMLButtonElement>(
							target,
							'[aria-label="expand test actions"]'
						);
					const collapsedIcons =
						expandButton.querySelectorAll<HTMLElement>(
							'[data-action-icon]'
						);

					expect(
						collapsedIcons[0]?.dataset.actionIcon
					).toBe('second');
					expect(
						target.querySelector(
							'[aria-label="first action"]'
						)
					).toBeNull();

					expandButton.click();
					await tick();

					const firstButton =
						requireElement<HTMLButtonElement>(
							target,
							'[aria-label="first action"]'
						);

					firstButton.click();
					await tick();

					expect(
						requireElement<HTMLElement>(
							target,
							'[data-selected-action]'
						).textContent
					).toBe('first');
					expect(
						target.querySelector(
							'[aria-label="expand test actions"]'
						)
					).not.toBeNull();
				} finally {
					await unmount(component);
					target.remove();
				}
			}
		);
	}
);

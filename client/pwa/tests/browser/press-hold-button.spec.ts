import {
	mount,
	tick,
	unmount
} from 'svelte';
import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import PressHoldButtonHost from './fixtures/press-hold-button-host.svelte';

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

function text(
	root: ParentNode,
	selector: string
): string {
	return requireElement<HTMLElement>(
		root,
		selector
	).textContent ?? '';
}

afterEach(() => {
	vi.useRealTimers();
});

describe(
	'KJVPressHoldButton',
	() => {
		it(
			'runs the primary action for an ordinary click',
			async () => {
				const target = document.createElement('div');
				document.body.appendChild(target);
				const component = mount(
					PressHoldButtonHost,
					{ target }
				);

				try {
					const button =
						requireElement<HTMLButtonElement>(
							target,
							'[aria-label="test press hold"]'
						);

					button.click();
					await tick();

					expect(text(target, '[data-presses]')).toBe('1');
					expect(text(target, '[data-holds]')).toBe('0');
				} finally {
					await unmount(component);
					target.remove();
				}
			}
		);

		it(
			'completes the hold action and suppresses the generated click',
			async () => {
				vi.useFakeTimers();

				const target = document.createElement('div');
				document.body.appendChild(target);
				const component = mount(
					PressHoldButtonHost,
					{ target }
				);

				try {
					const button =
						requireElement<HTMLButtonElement>(
							target,
							'[aria-label="test press hold"]'
						);

					button.dispatchEvent(
						new PointerEvent('pointerdown', {
							bubbles: true,
							button: 0
						})
					);

					vi.advanceTimersByTime(20);
					await tick();
					expect(
						target.querySelector('.hold-progress')
					).not.toBeNull();

					vi.advanceTimersByTime(80);
					await tick();

					button.dispatchEvent(
						new PointerEvent('pointerup', {
							bubbles: true,
							button: 0
						})
					);
					button.click();
					await tick();

					expect(text(target, '[data-holds]')).toBe('1');
					expect(text(target, '[data-presses]')).toBe('0');
				} finally {
					vi.runOnlyPendingTimers();
					await unmount(component);
					target.remove();
				}
			}
		);
	}
);

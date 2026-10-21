import '../../src/app.css';

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

import PlanDetailsScrollHost from './fixtures/plan-details-scroll-host.svelte';

function requireElement<T extends Element>(
	root: ParentNode,
	selector: string
): T {
	const element = root.querySelector<T>(selector);
	if (!element) {
		throw new Error(`Expected element matching ${selector}`);
	}
	return element;
}

describe('Plan Details scrolling', () => {
	it('keeps the title visible while the description scrolls to reveal readings', async () => {
		const target = document.createElement('div');
		document.body.appendChild(target);
		const component = mount(PlanDetailsScrollHost, { target });

		try {
			await tick();

			const title = requireElement<HTMLElement>(target, 'h2');
			const scroller = requireElement<HTMLElement>(
				target,
				'[id$="-scroll-container"]'
			);
			const description = requireElement<HTMLElement>(
				target,
				'[data-plan-description]'
			);
			const lastReading = requireElement<HTMLElement>(
				target,
				'[data-kjv-scrubber-value="3"]'
			);

			const titleTop = title.getBoundingClientRect().top;
			expect(scroller.scrollHeight).toBeGreaterThan(
				scroller.clientHeight
			);
			expect(getComputedStyle(scroller).overflowY).toBe('auto');

			scroller.scrollTop = scroller.scrollHeight;
			scroller.dispatchEvent(new Event('scroll'));
			await tick();

			const bounds = scroller.getBoundingClientRect();
			const lastReadingBounds = lastReading.getBoundingClientRect();
			expect(scroller.scrollTop).toBeGreaterThan(0);
			expect(title.getBoundingClientRect().top).toBeCloseTo(titleTop, 0);
			expect(description.getBoundingClientRect().bottom).toBeLessThan(
				bounds.top + 1
			);
			expect(lastReadingBounds.top).toBeGreaterThanOrEqual(bounds.top - 1);
			expect(lastReadingBounds.bottom).toBeLessThanOrEqual(bounds.bottom + 1);
		} finally {
			await unmount(component);
			target.remove();
		}
	});
});

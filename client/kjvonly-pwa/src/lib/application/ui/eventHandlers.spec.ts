import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	attachEvents,
	findElement,
	scrollTo,
	scrollToTop
} from './eventHandlers';

function createElement(): HTMLElement {
	return {
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		scrollIntoView: vi.fn(),
		scrollTo: vi.fn()
	} as unknown as HTMLElement;
}

function stubDocument(
	getElementById: (id: string) => HTMLElement | null
): void {
	vi.stubGlobal('document', {
		getElementById: vi.fn(getElementById)
	});
}

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('application UI event handlers', () => {
	it('returns an element immediately when it already exists', async () => {
		const element = createElement();
		stubDocument(() => element);

		await expect(findElement('target')).resolves.toBe(element);
		expect(document.getElementById).toHaveBeenCalledTimes(1);
	});

	it('returns an element found on the final retry', async () => {
		vi.useFakeTimers();

		const element = createElement();
		let calls = 0;

		stubDocument(() => {
			calls++;
			return calls === 11 ? element : null;
		});

		const result = findElement('target');
		await vi.advanceTimersByTimeAsync(10_000);

		await expect(result).resolves.toBe(element);
		expect(document.getElementById).toHaveBeenCalledTimes(11);
	});

	it('returns null after all retries are exhausted', async () => {
		vi.useFakeTimers();
		stubDocument(() => null);

		const result = findElement('missing');
		await vi.advanceTimersByTimeAsync(10_000);

		await expect(result).resolves.toBeNull();
		expect(document.getElementById).toHaveBeenCalledTimes(11);
	});

	it('attaches an event listener and returns cleanup', async () => {
		vi.useFakeTimers();

		const element = createElement();
		const listener = vi.fn();
		stubDocument(() => element);

		const detach = attachEvents(
			'target',
			'scroll',
			listener
		);

		await vi.advanceTimersByTimeAsync(50);

		expect(
			element.addEventListener
		).toHaveBeenCalledWith(
			'scroll',
			listener
		);

		detach();

		expect(
			element.removeEventListener
		).toHaveBeenCalledWith(
			'scroll',
			listener
		);
	});

	it('does not attach after cleanup while waiting for the element', async () => {
		vi.useFakeTimers();

		const element = createElement();
		let calls = 0;

		stubDocument(() => {
			calls++;
			return calls === 2
				? element
				: null;
		});

		const detach = attachEvents(
			'target',
			'scroll',
			vi.fn()
		);

		await vi.advanceTimersByTimeAsync(50);
		detach();
		await vi.advanceTimersByTimeAsync(1000);

		expect(
			element.addEventListener
		).not.toHaveBeenCalled();
	});

	it('scrolls an element into view before invoking the callback', async () => {
		vi.useFakeTimers();

		const element = createElement();
		const callback = vi.fn();
		stubDocument(() => element);

		scrollTo('target', callback);
		await vi.advanceTimersByTimeAsync(50);

		expect(element.scrollIntoView).toHaveBeenCalledWith({
			behavior: 'smooth',
			block: 'center',
			inline: 'nearest'
		});
		expect(callback).toHaveBeenCalledWith(element);
	});

	it('scrolls an element to the top before invoking the callback', async () => {
		vi.useFakeTimers();

		const element = createElement();
		const callback = vi.fn();
		stubDocument(() => element);

		scrollToTop('target', callback);
		await vi.advanceTimersByTimeAsync(50);

		expect(element.scrollTo).toHaveBeenCalledWith(0, 0);
		expect(callback).toHaveBeenCalledWith(element);
	});
});

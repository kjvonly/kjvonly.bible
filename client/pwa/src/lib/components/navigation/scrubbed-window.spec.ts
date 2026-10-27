import { describe, expect, it } from 'vitest';

import {
	ScrubbedWindow,
	type ScrubbedWindowEntry
} from './scrubbed-window';

describe('ScrubbedWindow', () => {
	function createWindow(totalItems = 100) {
		let entries: readonly ScrubbedWindowEntry<number>[] = [];

		const window = new ScrubbedWindow<number>({
			batchSize: 10,
			maxItems: 40,
			jumpItems: 20,
			loadItem: async (index) =>
				index < totalItems ? index : undefined,
			onChange: (nextEntries) => {
				entries = nextEntries;
			}
		});

		return {
			window,
			getEntries: () => entries
		};
	}

	it('loads an initial batch and slides forward while trimming the front', async () => {
		const { window, getEntries } = createWindow();

		await window.reset(100);
		await window.append();
		await window.append();
		await window.append();
		await window.append();

		expect(getEntries().map((entry) => entry.value)).toEqual(
			Array.from({ length: 40 }, (_, index) => index + 11)
		);
	});

	it('slides backward while trimming the end', async () => {
		const { window, getEntries } = createWindow();

		await window.reset(100);
		await window.prepareValue(60);
		await window.prepend();
		await window.prepend();

		const values = getEntries().map((entry) => entry.value);
		expect(values[0]).toBe(30);
		expect(values[values.length - 1]).toBe(69);
	});

	it('replaces the window around a distant scrubber value', async () => {
		const { window, getEntries } = createWindow(3000);

		await window.reset(3000);
		const preparedValue = await window.prepareValue(2000);

		expect(preparedValue).toBe(2000);
		expect(getEntries()[0]?.value).toBe(1990);
		expect(getEntries()[getEntries().length - 1]?.value).toBe(2009);
	});
});

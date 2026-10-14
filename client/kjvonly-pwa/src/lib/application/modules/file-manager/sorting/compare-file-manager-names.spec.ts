import {
	describe,
	expect,
	it
} from 'vitest';

import {
	compareFileManagerNames
} from './compare-file-manager-names';

describe('compareFileManagerNames', () => {
	it('orders numeric filename segments naturally, ignoring case', () => {
		const names = [
			'chapter 20.nd.json',
			'Chapter 3.nd.json',
			'Chapter 10.nd.json',
			'chapter 2.nd.json',
			'Chapter 1.nd.json'
		];

		expect(names.sort(compareFileManagerNames)).toEqual([
			'Chapter 1.nd.json',
			'chapter 2.nd.json',
			'Chapter 3.nd.json',
			'Chapter 10.nd.json',
			'chapter 20.nd.json'
		]);
	});

	it('breaks equivalent numeric and case comparisons deterministically', () => {
		const names = ['Chapter 1', 'Chapter 01', 'chapter 1'];
		const sorted = [...names].sort(compareFileManagerNames);

		expect([...names].reverse().sort(compareFileManagerNames))
			.toEqual(sorted);
		expect(compareFileManagerNames('Chapter 1', 'Chapter 01'))
			.not.toBe(0);
		expect(compareFileManagerNames('Chapter 1', 'Chapter 1'))
			.toBe(0);
	});
});

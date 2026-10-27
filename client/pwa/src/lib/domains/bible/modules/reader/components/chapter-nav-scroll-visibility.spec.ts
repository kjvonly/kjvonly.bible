import { describe, expect, it } from 'vitest';

import { ChapterNavScrollVisibility } from './chapter-nav-scroll-visibility';

const metrics = (scrollTop: number) => ({
	scrollTop,
	scrollHeight: 1200,
	clientHeight: 400
});

describe('Bible chapter navigation scroll visibility', () => {
	it('shows controls at the top and near the bottom', () => {
		const tracker = new ChapterNavScrollVisibility();
		expect(tracker.update(metrics(0))).toBe(true);
		expect(tracker.update(metrics(120))).toBe(false);
		expect(tracker.update(metrics(765))).toBe(true);
		expect(tracker.update(metrics(800))).toBe(true);
	});

	it('hides on downward scrolling and reappears when scrolling upward', () => {
		const tracker = new ChapterNavScrollVisibility();
		expect(tracker.update(metrics(100))).toBe(false);
		expect(tracker.update(metrics(96))).toBe(true);
		expect(tracker.update(metrics(100))).toBe(false);
	});

	it('ignores tiny movements until the direction threshold is reached', () => {
		const tracker = new ChapterNavScrollVisibility();
		tracker.reset(100);
		expect(tracker.update(metrics(101))).toBe(true);
		expect(tracker.update(metrics(103))).toBe(true);
		expect(tracker.update(metrics(104))).toBe(false);
		expect(tracker.update(metrics(103))).toBe(false);
		expect(tracker.update(metrics(100))).toBe(true);
	});

	it('resets visibility for a newly selected Bible location', () => {
		const tracker = new ChapterNavScrollVisibility();
		expect(tracker.update(metrics(300))).toBe(false);
		tracker.reset(300);
		expect(tracker.update(metrics(300))).toBe(true);
		expect(tracker.update(metrics(305))).toBe(false);
	});
});

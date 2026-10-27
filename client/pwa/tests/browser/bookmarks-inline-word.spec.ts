import { mount, tick, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';
import BookmarksInlineWordHost from './fixtures/bookmarks-inline-word-host.svelte';

async function withInlineWords(test: (target: HTMLDivElement) => Promise<void>): Promise<void> {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const component = mount(BookmarksInlineWordHost, { target });
	try {
		await tick();
		await test(target);
	} finally {
		await unmount(component);
		target.remove();
	}
}

async function click(target: HTMLElement, action: string): Promise<void> {
	const button = target.querySelector<HTMLButtonElement>(`[data-test-${action}]`);
	if (!button) throw new Error(`Missing test action: ${action}`);
	button.click();
	await tick();
}

function markers(target: HTMLElement): NodeListOf<HTMLButtonElement> {
	return target.querySelectorAll<HTMLButtonElement>('[data-bible-bookmark]');
}

describe('Bible Reader inline Bookmark indicator', () => {
	it('reactively shows the icon on its exact word, not the verse number', async () => {
		await withInlineWords(async (target) => {
			expect(markers(target)).toHaveLength(0);
			await click(target, 'add-bookmark');
			expect(markers(target)).toHaveLength(1);
			expect(markers(target)[0]?.dataset.verse).toBe('16');
			expect(markers(target)[0]?.dataset.wordIndex).toBe('2');
			expect(markers(target)[0]?.querySelector('svg')).not.toBeNull();
		});
	});

	it('keeps one marker for duplicate bookmarks until the last one is deleted', async () => {
		await withInlineWords(async (target) => {
			await click(target, 'add-bookmark');
			await click(target, 'add-duplicate');
			expect(markers(target)).toHaveLength(1);
			await click(target, 'delete-first');
			expect(markers(target)).toHaveLength(1);
			await click(target, 'delete-second');
			expect(markers(target)).toHaveLength(0);
		});
	});

	it('moves the marker from a word to the verse-number token', async () => {
		await withInlineWords(async (target) => {
			await click(target, 'add-bookmark');
			await click(target, 'move-to-verse');
			expect(markers(target)).toHaveLength(1);
			expect(markers(target)[0]?.dataset.wordIndex).toBe('0');
		});
	});

	it('keeps the original marker for a duplicate when moving just one bookmark', async () => {
		await withInlineWords(async (target) => {
			await click(target, 'add-bookmark');
			await click(target, 'add-duplicate');
			await click(target, 'move-to-verse');
			expect([...markers(target)].map((marker) => marker.dataset.wordIndex)).toEqual(['0', '2']);
			await click(target, 'delete-second');
			expect([...markers(target)].map((marker) => marker.dataset.wordIndex)).toEqual(['0']);
		});
	});

	it('removes the old chapter marker and shows it when navigating to the new chapter', async () => {
		await withInlineWords(async (target) => {
			await click(target, 'add-bookmark');
			expect(markers(target)).toHaveLength(1);
			await click(target, 'move-to-next-chapter');
			expect(markers(target)).toHaveLength(0);
			await click(target, 'view-next-chapter');
			expect(markers(target)).toHaveLength(1);
			expect(markers(target)[0]?.dataset.wordIndex).toBe('2');
		});
	});
});

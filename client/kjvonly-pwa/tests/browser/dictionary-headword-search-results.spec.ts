import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import DictionarySearchResults from '$lib/domains/dictionary/ui/DictionarySearchResults.svelte';
import type { DictionarySearchMatch } from '$lib/domains/dictionary';

const publisher = 'test-publisher';

/** Constructs lightweight matches: intentionally no definitions or HTML content. */
function match(word: string, edition: 'webster-1828' | 'webster-1844'): DictionarySearchMatch {
	return {
		publisher,
		resourceId: `kjvonly/dictionary/entries/${edition}`,
		headwordKey: word
	};
}

let target: HTMLDivElement | undefined;
let mounted: ReturnType<typeof mount> | undefined;

afterEach(async () => {
	if (mounted) await unmount(mounted);
	target?.remove();
	target = undefined;
	mounted = undefined;
});

/** Creates the actual scrubbed results component in a browser DOM. */
function render(matches: readonly DictionarySearchMatch[], onSelect: (match: DictionarySearchMatch) => void): void {
	target = document.createElement('div');
	target.style.height = '500px';
	document.body.append(target);
	mounted = mount(DictionarySearchResults, { target, props: { matches, onSelect } });
}

describe('Dictionary headword results', () => {
	it('renders selectable headwords without repeating the edition and publisher for each row', async () => {
		const onSelect = vi.fn();
		const matches = [match('abandon', 'webster-1828'), match('abandon', 'webster-1844')];
		render(matches, onSelect);
		await vi.waitFor(() => expect(target?.querySelectorAll('[data-kjv-scrubber-value] button').length).toBe(2));
		expect(target?.textContent).not.toContain('webster 1828');
		expect(target?.textContent).not.toContain('webster 1844');
		expect(target?.textContent).not.toContain(publisher);
		expect(target?.textContent).not.toContain('<div>');
		(target?.querySelectorAll('[data-kjv-scrubber-value] button')[1] as HTMLButtonElement).click();
		await tick();
		expect(onSelect).toHaveBeenCalledExactlyOnceWith(matches[1]);
	});

	it('uses a full-width hover target with padded text and a minimum row height', async () => {
		render([match('abandon', 'webster-1828')], vi.fn());
		await vi.waitFor(() => expect(target?.querySelector('[data-kjv-scrubber-value] button')).not.toBeNull());
		const row = target?.querySelector<HTMLElement>('[data-kjv-scrubber-value]');
		const button = row?.querySelector<HTMLButtonElement>('button');
		expect(row?.classList.contains('px-4')).toBe(false);
		expect(button?.classList.contains('w-full')).toBe(true);
		expect(button?.classList.contains('px-4')).toBe(true);
		expect(button?.classList.contains('min-h-12')).toBe(true);
		expect(button?.classList.contains('hover:bg-neutral-100')).toBe(true);
	});

	it('renders only the first 20 headword references from a large search result', async () => {
		render(Array.from({ length: 250 }, (_, index) => match(`ab${String(index).padStart(4, '0')}`, 'webster-1828')), vi.fn());
		await vi.waitFor(() => expect(target?.querySelectorAll('[data-kjv-scrubber-value]').length).toBe(20));
		expect(target?.textContent).toContain('ab0000');
		expect(target?.textContent).not.toContain('ab0200');
	});

	it('calls the selection action with the exact dictionary Resource identity', async () => {
		const onSelect = vi.fn();
		const selected = match('abandon', 'webster-1844');
		render([selected], onSelect);
		await vi.waitFor(() => expect(target?.querySelector('button')).not.toBeNull());
		(target?.querySelector('button') as HTMLButtonElement).click();
		await tick();
		expect(onSelect).toHaveBeenCalledExactlyOnceWith(selected);
	});
});

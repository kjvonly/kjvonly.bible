import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import DictionaryAlphabetBrowse from '$lib/domains/dictionary/ui/DictionaryAlphabetBrowse.svelte';

let target: HTMLElement | undefined;
let mounted: ReturnType<typeof mount> | undefined;

afterEach(async () => {
	if (mounted) await unmount(mounted);
	target?.remove();
	mounted = undefined;
	target = undefined;
});

/** Mount the actual letter control without bootstrapping an application. */
async function render(selected: string, onSelect = vi.fn()): Promise<HTMLButtonElement[]> {
	target = document.createElement('div');
	document.body.append(target);
	mounted = mount(DictionaryAlphabetBrowse, { target, props: { selected, onSelect } });
	await tick();
	return Array.from(target.querySelectorAll<HTMLButtonElement>('button'));
}

describe('Dictionary alphabetical browsing control', () => {
	it('shows all 26 uppercase letters with the selected letter accented and underlined', async () => {
		const buttons = await render('a');
		expect(buttons.map(button => button.textContent)).toEqual('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
		expect(buttons[0]?.getAttribute('aria-pressed')).toBe('true');
		expect(buttons[0]?.className).toContain('text-support-a-500');
		expect(buttons[0]?.className).toContain('underline');
		expect(buttons[1]?.getAttribute('aria-pressed')).toBe('false');
		expect(buttons[1]?.className).not.toContain('text-support-a-500');
		expect(target?.textContent).not.toContain('definition');
	});

	it('reports the selected canonical letter for worker-side prefix browsing', async () => {
		const onSelect = vi.fn();
		const buttons = await render('a', onSelect);
		buttons[25]!.click();
		expect(onSelect).toHaveBeenCalledExactlyOnceWith('z');
	});
});

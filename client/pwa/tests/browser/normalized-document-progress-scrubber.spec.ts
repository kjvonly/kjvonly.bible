import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import NormalizedDocumentProgress from '$lib/domains/normalized-content/modules/reader/normalizedDocumentProgress.svelte';

let target: HTMLDivElement | undefined;
let component: ReturnType<typeof mount> | undefined;

afterEach(async () => {
	if (component) await unmount(component);
	target?.remove();
	component = undefined;
	target = undefined;
});

describe('Normalized document progress scrubber', () => {
	it('shows full-document progress and commits a selected percentage without creating a scroller', async () => {
		const onSeek = vi.fn();
		target = document.createElement('div');
		document.body.append(target);
		component = mount(NormalizedDocumentProgress, {
			target,
			props: { progress: 0.42, height: 400, onSeek }
		});
		await tick();

		const range = target.querySelector<HTMLInputElement>('input[aria-label="Document progress"]');
		expect(range).not.toBeNull();
		expect(range!.value).toBe('420');
		expect(range!.getAttribute('aria-valuetext')).toBe('42%');
		expect(target.querySelector('[id$="-scroll-container"]')).toBeNull();

		range!.value = '735';
		range!.dispatchEvent(new Event('input', { bubbles: true }));
		range!.dispatchEvent(new Event('change', { bubbles: true }));
		expect(onSeek).toHaveBeenCalledOnce();
		expect(onSeek).toHaveBeenCalledWith(0.735);
	});
});

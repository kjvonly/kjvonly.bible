import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';

import NormalizedReaderFloatingControlsHost from './fixtures/normalized-reader-floating-controls-host.svelte';
import { NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT } from '$lib/domains/normalized-content/modules/reader/runtime/normalized-content-block-window-scroll';

let component: ReturnType<typeof mount> | undefined;
let host: HTMLDivElement | undefined;
let scrollContainer: HTMLDivElement | undefined;
let renderedHeight = 800;

const nextButton = (): HTMLButtonElement | null =>
	host?.querySelector<HTMLButtonElement>('button[aria-label="Next document"]') ?? null;

async function renderButtons(atDocumentEnd: boolean, documentReady = true): Promise<void> {
	scrollContainer = document.createElement('div');
	scrollContainer.id = 'window-boundary-test-scroll-container';
	Object.defineProperty(scrollContainer, 'clientHeight', { value: 300 });
	Object.defineProperty(scrollContainer, 'scrollTop', { value: 0, writable: true });
	Object.defineProperty(scrollContainer, 'scrollHeight', { get: () => renderedHeight });
	document.body.append(scrollContainer);
	host = document.createElement('div');
	document.body.append(host);
	component = mount(NormalizedReaderFloatingControlsHost, {
		target: host,
		props: {
			scrollContainerId: scrollContainer.id,
			currentIndex: 1,
			documentReady,
			atDocumentStart: true,
			atDocumentEnd
		}
	});
	await tick();
}

async function hideByScrollingDown(): Promise<void> {
	if (!scrollContainer) throw new Error('Missing test scroll container');
	scrollContainer.scrollTop = 300;
	scrollContainer.dispatchEvent(new Event('scroll'));
	// The actual controls use a 500ms fade transition.
	await vi.waitFor(() => expect(nextButton()).toBeNull(), { timeout: 1500 });
}

afterEach(async () => {
	if (component) await unmount(component);
	host?.remove();
	scrollContainer?.remove();
	component = undefined;
	host = undefined;
	scrollContainer = undefined;
	renderedHeight = 800;
});

describe('Normalized Reader sequence controls with windowed content', () => {
    it('starts visible, hides after downward scrolling, and shows again on upward scrolling', async () => {
        await renderButtons(false);
        expect(nextButton()).not.toBeNull();
        await hideByScrollingDown();
        scrollContainer!.scrollTop = 260;
        scrollContainer!.dispatchEvent(new Event('scroll'));
        await tick();
        expect(nextButton()).not.toBeNull();
    });

    it('does not mistake scroll-anchor corrections for user scrolling', async () => {
        await renderButtons(false);
        // Prepending a block can increase scrollTop as the viewport preserves
        // the same visible word; that must not hide initially visible controls.
        scrollContainer!.scrollTop = 400;
        scrollContainer!.dispatchEvent(new Event(NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT));
        scrollContainer!.dispatchEvent(new Event('scroll'));
        await tick();
        expect(nextButton()).not.toBeNull();

        scrollContainer!.scrollTop = 450;
        scrollContainer!.dispatchEvent(new Event('scroll'));
        await vi.waitFor(() => expect(nextButton()).toBeNull(), { timeout: 1500 });
        scrollContainer!.scrollTop = 500;
        scrollContainer!.dispatchEvent(new Event(NORMALIZED_WINDOW_ANCHOR_RESTORED_EVENT));
        scrollContainer!.dispatchEvent(new Event('scroll'));
        await tick();
        expect(nextButton()).toBeNull();

        scrollContainer!.scrollTop = 480;
        scrollContainer!.dispatchEvent(new Event('scroll'));
        await tick();
        expect(nextButton()).not.toBeNull();
    });
	it('does not reveal the controls at the end of a partial rendered window', async () => {
		await renderButtons(false);
		await hideByScrollingDown();

		// Reaching the end of the mounted blocks must not impersonate the
		// final document boundary while further canonical leaves remain.
		renderedHeight = 600;
		scrollContainer!.dispatchEvent(new Event('scroll'));
		await tick();
		expect(nextButton()).toBeNull();
	});

	it('reveals the controls at the true document end', async () => {
		await renderButtons(true);
		await hideByScrollingDown();

		renderedHeight = 600;
		scrollContainer!.dispatchEvent(new Event('scroll'));
		await tick();
		expect(nextButton()).not.toBeNull();
	});
});

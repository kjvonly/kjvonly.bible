import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import NormalizedReaderFloatingControlsHost from './fixtures/normalized-reader-floating-controls-host.svelte';

let component: ReturnType<typeof mount> | undefined;
let host: HTMLDivElement | undefined;
let scrollContainer: HTMLDivElement | undefined;

const progress = () => host?.querySelector<HTMLInputElement>('input[aria-label="Document progress"]') ?? null;
const next = () => host?.querySelector<HTMLButtonElement>('button[aria-label="Next document"]') ?? null;

async function mountControls(showButtons: boolean): Promise<void> {
	scrollContainer = document.createElement('div');
	scrollContainer.id = 'floating-controls-test-scroll-container';
	Object.defineProperty(scrollContainer, 'clientHeight', { value: 300 });
	Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1200 });
	Object.defineProperty(scrollContainer, 'scrollTop', { value: 0, writable: true });
	document.body.append(scrollContainer);
	host = document.createElement('div');
	document.body.append(host);
	component = mount(NormalizedReaderFloatingControlsHost, {
		target: host,
		props: { scrollContainerId: scrollContainer.id, showButtons }
	});
	await tick();
}

async function scrollTo(top: number): Promise<void> {
	if (!scrollContainer) throw new Error('Missing scroll container');
	scrollContainer.scrollTop = top;
	scrollContainer.dispatchEvent(new Event('scroll'));
	await tick();
}

afterEach(async () => {
	if (component) await unmount(component);
	host?.remove();
	scrollContainer?.remove();
	component = undefined;
	host = undefined;
	scrollContainer = undefined;
});

describe('Normalized Reader floating controls visibility', () => {
	it('hides and shows the progress scrubber together with Previous/Next controls', async () => {
		await mountControls(true);
		expect(progress()).not.toBeNull();
		expect(next()).not.toBeNull();

		await scrollTo(300);
		await vi.waitFor(() => {
			expect(progress()).toBeNull();
			expect(next()).toBeNull();
		}, { timeout: 1500 });

		await scrollTo(250);
		expect(progress()).not.toBeNull();
		expect(next()).not.toBeNull();
	});

	it('uses the same scroll visibility with a standalone document (no sequence buttons)', async () => {
		await mountControls(false);
		expect(progress()).not.toBeNull();
		expect(next()).toBeNull();

		await scrollTo(300);
		await vi.waitFor(() => expect(progress()).toBeNull(), { timeout: 1500 });
		await scrollTo(250);
		expect(progress()).not.toBeNull();
		expect(next()).toBeNull();
	});
});

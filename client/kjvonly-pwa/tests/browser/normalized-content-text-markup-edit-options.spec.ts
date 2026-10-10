import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	mount,
	tick,
	unmount
} from 'svelte';

import NormalizedContentTextMarkupEditOptions from '$lib/domains/normalized-content/modules/reader/normalizedContentTextMarkupEditOptions.svelte';
import type {
	NormalizedContentTextMarkupEditSelection
} from '$lib/domains/normalized-content/modules/reader/normalized-content-text-markup-edit';

let root: HTMLDivElement | undefined;
let component: ReturnType<typeof mount> | undefined;

afterEach(async () => {
	if (component) {
		await unmount(component);
	}
	root?.remove();
	root = undefined;
	component = undefined;
});

describe('Normalized Content Text Markup edit options', () => {
	it('uses the current color when selecting another markup family', () => {
		const onSelectionChange = vi.fn();
		mountOptions({ type: 'bg', colorMarkup: 'bg-highlightc' }, onSelectionChange);
		requireButton('text color').click();
		expect(onSelectionChange).toHaveBeenCalledWith({
			type: 'text',
			colorMarkup: 'text-highlightc'
		});
	});

	it('expands the Bible-aligned color palette before selecting a color', async () => {
		const onSelectionChange = vi.fn();
		mountOptions({ type: 'bg', colorMarkup: 'bg-highlighta' }, onSelectionChange);
		requireButton('expand colors').click();
		await tick();
		expect(onSelectionChange).not.toHaveBeenCalled();
		expect(requireButton('select color d')).toBeDefined();
		requireButton('select color d').click();
		expect(onSelectionChange).toHaveBeenCalledWith({
			type: 'bg',
			colorMarkup: 'bg-highlightd'
		});
	});

	it('exposes text, highlight, and underline markup tools', () => {
		mountOptions({ type: 'bg', colorMarkup: 'bg-highlighta' }, vi.fn());
		expect(requireButton('text color')).toBeDefined();
		expect(requireButton('highlight color')).toBeDefined();
		expect(requireButton('underline color')).toBeDefined();
	});
});

function mountOptions(
	selection: NormalizedContentTextMarkupEditSelection,
	onSelectionChange: (
		selection: NormalizedContentTextMarkupEditSelection
	) => void
): void {
	root = window.document.createElement('div');
	window.document.body.append(root);
	component = mount(NormalizedContentTextMarkupEditOptions, {
		target: root,
		props: { selection, onSelectionChange }
	});
}

function requireButton(label: string): HTMLButtonElement {
	const button = root?.querySelector(`button[aria-label="${label}"]`);
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error(`Expected button with aria-label ${label}.`);
	}
	return button;
}

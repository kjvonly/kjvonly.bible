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
import { ReaderActionKind } from '$lib/domains/normalized-content/modules/reader/actions/reader-action-state';
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

	it('places Add Note after markup tools and omits the moved Document Notes command', () => {
		const onAddNote = vi.fn();
		mountOptions(
			{ type: 'bg', colorMarkup: 'bg-highlighta' },
			vi.fn(),
			{ onAddNote }
		);
		const notes = root!.querySelector('[role="group"][aria-label="note actions"]');
		expect(notes).not.toBeNull();
		expect(notes?.previousElementSibling?.getAttribute('aria-hidden')).toBe('true');
		expect(notes?.previousElementSibling?.className).toContain('w-px');
		expect(root?.querySelector('button[aria-label="document notes"]')).toBeNull();
		requireButton('add note').click();
		expect(onAddNote).toHaveBeenCalledOnce();
	});

	it('places Add Bookmark after Notes, with its own cancellable selection prompt', async () => {
		const onAddBookmark = vi.fn();
		const onCancelWordSelection = vi.fn();
		mountOptions({ type: 'bg', colorMarkup: 'bg-highlighta' }, vi.fn(), {
			onAddBookmark, onCancelWordSelection
		});
		const bookmarks = root!.querySelector('[role="group"][aria-label="bookmark actions"]');
		expect(bookmarks).not.toBeNull();
		expect(bookmarks?.previousElementSibling?.getAttribute('aria-hidden')).toBe('true');
		requireButton('add bookmark').click();
		expect(onAddBookmark).toHaveBeenCalledOnce();
		await unmount(component!);
		component = undefined;
		root!.replaceChildren();
		mountOptions({ type: 'bg', colorMarkup: 'bg-highlighta' }, vi.fn(), {
			actionKind: ReaderActionKind.AddBookmark, onCancelWordSelection
		});
		expect(root?.textContent).toContain('Select a word for the bookmark');
		expect(root?.querySelector('[aria-label="text color"]')).toBeNull();
		requireButton('cancel bookmark location selection').click();
		expect(onCancelWordSelection).toHaveBeenCalledOnce();
	});

	it('replaces the toolbar with a cancellable word Note prompt', () => {
		const onCancelWordSelection = vi.fn();
		mountOptions(
			{ type: 'bg', colorMarkup: 'bg-highlighta' },
			vi.fn(),
			{ actionKind: ReaderActionKind.AddNote, onCancelWordSelection }
		);
		expect(root?.textContent).toContain('Select a word for the note');
		expect(root?.querySelector('[aria-label="note actions"]')).toBeNull();
		expect(root?.querySelector('[aria-label="text color"]')).toBeNull();
		requireButton('cancel note location selection').click();
		expect(onCancelWordSelection).toHaveBeenCalledOnce();
	});

	it('renders the relocation prompt and keeps it cancellable without showing markup tools', () => {
		const onCancelWordSelection = vi.fn();
		mountOptions({ type: 'bg', colorMarkup: 'bg-highlighta' }, vi.fn(), {
			actionKind: ReaderActionKind.MoveBookmark, onCancelWordSelection
		});
		expect(root?.textContent).toContain('Select the new word for the bookmark');
		expect(root?.querySelector('[aria-label="markup color picker"]')).toBeNull();
		expect(root?.querySelector('[aria-label="note actions"]')).toBeNull();
		requireButton('cancel bookmark location selection').click();
		expect(onCancelWordSelection).toHaveBeenCalledOnce();
	});

	it('offers Note and Bookmark actions without markup after an explicit skip', () => {
		const onAddNote = vi.fn();
		const onAddBookmark = vi.fn();
		mountOptions({ type: 'bg', colorMarkup: 'bg-highlighta' }, vi.fn(), {
			actionKind: ReaderActionKind.WithoutMarkup, onAddNote, onAddBookmark
		});
		expect(root?.textContent).toContain('Choose an action');
		expect(root?.querySelector('[aria-label="markup color picker"]')).toBeNull();
		expect(root?.querySelector('[aria-label="text color"]')).toBeNull();
		requireButton('add note').click();
		requireButton('add bookmark').click();
		expect(onAddNote).toHaveBeenCalledOnce();
		expect(onAddBookmark).toHaveBeenCalledOnce();
	});

	it('freezes palette and action controls during a pending transition or save', () => {
		const onSelectionChange = vi.fn();
		const onAddNote = vi.fn();
		mountOptions({ type: 'bg', colorMarkup: 'bg-highlighta' }, onSelectionChange, {
			busy: true, onAddNote
		});
		expect(requireButton('expand colors').disabled).toBe(true);
		expect(requireButton('text color').disabled).toBe(true);
		expect(requireButton('highlight color').disabled).toBe(true);
		expect(requireButton('underline color').disabled).toBe(true);
		expect(requireButton('add note').disabled).toBe(true);
		expect(requireButton('add bookmark').disabled).toBe(true);
		expect(requireButton('update bookmark').disabled).toBe(true);
		requireButton('text color').click();
		requireButton('add note').click();
		expect(onSelectionChange).not.toHaveBeenCalled();
		expect(onAddNote).not.toHaveBeenCalled();
	});

	it('disables selection cancellation while its action is busy', () => {
		mountOptions({ type: 'bg', colorMarkup: 'bg-highlighta' }, vi.fn(), {
			actionKind: ReaderActionKind.AddNote, busy: true
		});
		expect(requireButton('cancel note location selection').disabled).toBe(true);
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
	) => void,
	extra: {
		actionKind?: ReaderActionKind;
		busy?: boolean;
		onAddBookmark?: () => void;
		onCancelWordSelection?: () => void;
		onAddNote?: () => void;
	} = {}
): void {
	root = window.document.createElement('div');
	window.document.body.append(root);
	component = mount(NormalizedContentTextMarkupEditOptions, {
		target: root,
		props: { actionKind: ReaderActionKind.TextMarkup, selection, onSelectionChange, ...extra }
	});
}

function requireButton(label: string): HTMLButtonElement {
	const button = root?.querySelector(`button[aria-label="${label}"]`);
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error(`Expected button with aria-label ${label}.`);
	}
	return button;
}

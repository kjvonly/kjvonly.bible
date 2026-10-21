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

	it('places Document Notes and Add Note after the markup tools and divider', () => {
		const onDocumentNotes = vi.fn();
		const onAddNote = vi.fn();
		mountOptions(
			{ type: 'bg', colorMarkup: 'bg-highlighta' },
			vi.fn(),
			{ onDocumentNotes, onAddNote }
		);
		const notes = root!.querySelector('[role="group"][aria-label="note actions"]');
		expect(notes).not.toBeNull();
		expect(notes?.previousElementSibling?.getAttribute('aria-hidden')).toBe('true');
		expect(notes?.previousElementSibling?.className).toContain('w-px');
		requireButton('document notes').click();
		requireButton('add note').click();
		expect(onDocumentNotes).toHaveBeenCalledOnce();
		expect(onAddNote).toHaveBeenCalledOnce();
	});

	it('places Add Bookmark after Notes, with its own cancellable selection prompt', async () => {
		const onAddBookmark = vi.fn();
		const onCancelBookmarkSelection = vi.fn();
		mountOptions({ type: 'bg', colorMarkup: 'bg-highlighta' }, vi.fn(), {
			onAddBookmark, onCancelBookmarkSelection
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
			choosingBookmarkWord: true, onCancelBookmarkSelection
		});
		expect(root?.textContent).toContain('Select a word for the bookmark');
		expect(root?.querySelector('[aria-label="text color"]')).toBeNull();
		requireButton('cancel bookmark location selection').click();
		expect(onCancelBookmarkSelection).toHaveBeenCalledOnce();
	});

	it('replaces the toolbar with a cancellable word Note prompt', () => {
		const onCancelNoteSelection = vi.fn();
		mountOptions(
			{ type: 'bg', colorMarkup: 'bg-highlighta' },
			vi.fn(),
			{ choosingWordNote: true, onCancelNoteSelection }
		);
		expect(root?.textContent).toContain('Select a word for the note');
		expect(root?.querySelector('[aria-label="note actions"]')).toBeNull();
		expect(root?.querySelector('[aria-label="text color"]')).toBeNull();
		requireButton('cancel note location selection').click();
		expect(onCancelNoteSelection).toHaveBeenCalledOnce();
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
		choosingWordNote?: boolean;
		choosingBookmarkWord?: boolean;
		onAddBookmark?: () => void;
		onCancelBookmarkSelection?: () => void;
		onDocumentNotes?: () => void;
		onAddNote?: () => void;
		onCancelNoteSelection?: () => void;
	} = {}
): void {
	root = window.document.createElement('div');
	window.document.body.append(root);
	component = mount(NormalizedContentTextMarkupEditOptions, {
		target: root,
		props: { selection, onSelectionChange, ...extra }
	});
}

function requireButton(label: string): HTMLButtonElement {
	const button = root?.querySelector(`button[aria-label="${label}"]`);
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error(`Expected button with aria-label ${label}.`);
	}
	return button;
}

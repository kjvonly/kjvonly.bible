import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import { mount, tick, unmount } from 'svelte';
import type { NormalizedDocument } from '$lib/domains/normalized-content';
import { NormalizedContentRenderer } from '$lib/domains/normalized-content/ui';

const document: NormalizedDocument = {
	blocks: [{
		type: 'paragraph',
		id: '__proto__',
		content: [
			{ type: 'word', text: 'Before' },
			{ type: 'anchor', id: 'local-target' },
			{
				type: 'word', text: 'Linked',
				href: ['bibleLocationReference:1_1_1']
			}
		]
	}]
};

let root: HTMLDivElement | undefined;
let component: ReturnType<typeof mount> | undefined;

afterEach(async () => {
	if (component) await unmount(component);
	root?.remove();
	root = undefined;
	component = undefined;
});

describe('normalized word Note markers', () => {
	it('opens the canonical address separately from a linked word', async () => {
		const onWordMarkerActivate = vi.fn();
		const onLinkActivate = vi.fn(() => true);
		mountRenderer({
			wordMarkers: new Map([['__proto__', new Set([2])]]),
			onWordMarkerActivate,
			onLinkActivate
		});

		const marker = root?.querySelector<HTMLButtonElement>(
			'button[data-normalized-word-note]'
		);
		expect(marker).not.toBeNull();
		expect(marker?.getAttribute('aria-label')).toBe('Open word notes');
		expect(marker?.dataset.normalizedNoteBlock).toBe('__proto__');
		expect(marker?.dataset.normalizedNoteIndex).toBe('2');
		expect(marker?.closest('a')).toBeNull();
		expect(root?.querySelectorAll('[data-normalized-word-note]')).toHaveLength(1);
		// The button precedes the marked linked word, outside its <a> element.
		expect(marker?.nextElementSibling).toBe(root?.querySelector('a'));
		expect(marker?.previousElementSibling?.getAttribute('data-normalized-content-kind'))
			.toBe('separator');
		// The marker must not add text-node whitespace between or after words.
		expect(root?.querySelector('p')?.textContent).toBe('Before Linked');

		marker!.click();
		await tick();
		expect(onWordMarkerActivate).toHaveBeenCalledWith({
			blockId: '__proto__', contentIndex: 2
		});
		expect(onLinkActivate).not.toHaveBeenCalled();

		root!.querySelector<HTMLAnchorElement>('a')!.click();
		expect(onLinkActivate).toHaveBeenCalledWith([
			'bibleLocationReference:1_1_1'
		]);
	});

	it('renders a first-word marker before its word without inserting whitespace', () => {
		mountRenderer({
			wordMarkers: new Map([['__proto__', new Set([0])]]),
			onWordMarkerActivate: vi.fn()
		});

		const paragraph = root?.querySelector('p');
		const marker = paragraph?.querySelector('button[data-normalized-word-note]');
		const word = paragraph?.querySelector('[data-normalized-content-kind="word"][data-normalized-content-index="0"]');
		expect(paragraph?.firstElementChild).toBe(marker);
		expect(marker?.nextElementSibling).toBe(word);
		expect(paragraph?.textContent).toBe('Before Linked');
	});

	it('preserves joinPrevious when the joined word has a note', () => {
		mountRenderer({
			document: {
				blocks: [{
					type: 'paragraph',
					id: 'joined',
					content: [
						{ type: 'word', text: 'K' },
						{ type: 'word', text: 'JV', joinPrevious: true }
					]
				}]
			},
			wordMarkers: new Map([['joined', new Set([1])]]),
			onWordMarkerActivate: vi.fn()
		});

		const paragraph = root?.querySelector('p');
		const marker = paragraph?.querySelector('button[data-normalized-word-note]');
		const joined = paragraph?.querySelector('[data-normalized-content-index="1"]');
		expect(marker?.nextElementSibling).toBe(joined);
		expect(paragraph?.textContent).toBe('KJV');
	});

	it('renders Bookmark and Note markers before a linked word without changing its text', async () => {
		const onBookmarkMarkerActivate = vi.fn();
		const onWordMarkerActivate = vi.fn();
		const onLinkActivate = vi.fn(() => true);
		mountRenderer({
			wordMarkers: new Map([['__proto__', new Set([2])]]),
			bookmarkMarkers: new Map([['__proto__', new Set([2])]]),
			onBookmarkMarkerActivate, onWordMarkerActivate, onLinkActivate
		});
		const paragraph = root?.querySelector('p');
		const bookmark = paragraph?.querySelector<HTMLButtonElement>('[data-normalized-word-bookmark]');
		const note = paragraph?.querySelector('[data-normalized-word-note]');
		const word = paragraph?.querySelector('a');
		expect(bookmark?.getAttribute('aria-label')).toBe('Open word bookmarks');
		expect(bookmark?.dataset.normalizedBookmarkBlock).toBe('__proto__');
		expect(bookmark?.dataset.normalizedBookmarkIndex).toBe('2');
		expect(bookmark?.closest('a')).toBeNull();
		expect(bookmark?.nextElementSibling).toBe(note);
		expect(note?.nextElementSibling).toBe(word);
		expect(paragraph?.textContent).toBe('Before Linked');
		bookmark!.click();
		await tick();
		expect(onBookmarkMarkerActivate).toHaveBeenCalledWith({ blockId: '__proto__', contentIndex: 2 });
		expect(onWordMarkerActivate).not.toHaveBeenCalled();
		expect(onLinkActivate).not.toHaveBeenCalled();
	});

	it('keeps joinPrevious text exact when a Bookmark marker precedes the joined word', () => {
		mountRenderer({
			document: { blocks: [{ type: 'paragraph', id: 'joined', content: [
				{ type: 'word', text: 'K' },
				{ type: 'word', text: 'JV', joinPrevious: true }
			] }] },
			bookmarkMarkers: new Map([['joined', new Set([1])]]),
			onBookmarkMarkerActivate: vi.fn()
		});
		const paragraph = root?.querySelector('p');
		const bookmark = paragraph?.querySelector('[data-normalized-word-bookmark]');
		const word = paragraph?.querySelector('[data-normalized-content-kind="word"][data-normalized-content-index="1"]');
		expect(bookmark?.nextElementSibling).toBe(word);
		expect(paragraph?.textContent).toBe('KJV');
	});

	it('does not create buttons without membership or a handler', () => {
		mountRenderer({
			wordMarkers: new Map([['__proto__', new Set([2])]])
		});
		expect(root?.querySelector('[data-normalized-word-note]')).toBeNull();
		// The optional marker block must be whitespace-neutral when not shown.
		expect(root?.querySelector('p')?.textContent).toBe('Before Linked');
	});
});

function mountRenderer(props: {
	document?: NormalizedDocument;
	wordMarkers?: ReadonlyMap<string, ReadonlySet<number>>;
	bookmarkMarkers?: ReadonlyMap<string, ReadonlySet<number>>;
	onBookmarkMarkerActivate?: (address: {blockId: string; contentIndex: number}) => void;
	onWordMarkerActivate?: (address: {blockId: string; contentIndex: number}) => void;
	onLinkActivate?: (hrefs: readonly string[]) => boolean;
}): void {
	root = window.document.createElement('div');
	window.document.body.append(root);
	component = mount(NormalizedContentRenderer, {
		target: root,
		props: { document, ...props }
	});
}

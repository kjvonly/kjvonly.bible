import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	mount,
	unmount
} from 'svelte';

import type {
	NormalizedDocument
} from '$lib/domains/normalized-content';

import {
	NormalizedContentRenderer,
	type NormalizedContentLinkHandler,
	type NormalizedContentWordActivationHandler
} from '$lib/domains/normalized-content/ui';

let root: HTMLDivElement | undefined;
let component: ReturnType<typeof mount> | undefined;

afterEach(async () => {
	if (component) {
		await unmount(
			component
		);
	}

	root?.remove();
	root = undefined;
	component = undefined;
});

describe(
	'NormalizedContentRenderer word activation',
	() => {
		it(
			'delegates the exact canonical blockId + contentIndex address',
			() => {
				const onWordActivate =
					vi.fn(() => true);

				mountDocument(
					createDocument(),
					onWordActivate
				);

				const word =
					requireElement(
						'#paragraph-1 [data-normalized-content-kind="word"][data-normalized-content-index="2"]'
					);
				const event = ordinaryClick();

				word.dispatchEvent(event);

				expect(event.defaultPrevented).toBe(true);
				expect(onWordActivate).toHaveBeenCalledTimes(1);
				expect(onWordActivate).toHaveBeenCalledWith({
					blockId: 'paragraph-1',
					contentIndex: 2
				});
			}
		);

		it(
			'lets word activation consume a linked word before link navigation',
			() => {
				const onWordActivate =
					vi.fn(() => true);
				const onLinkActivate =
					vi.fn(() => true);

				mountDocument(
					createLinkedDocument(),
					onWordActivate,
					onLinkActivate
				);

				const event = ordinaryClick();
				requireElement('a').dispatchEvent(event);

				expect(event.defaultPrevented).toBe(true);
				expect(onWordActivate).toHaveBeenCalledWith({
					blockId: 'linked-paragraph',
					contentIndex: 0
				});
				expect(onLinkActivate).not.toHaveBeenCalled();
			}
		);

		it(
			'continues to linked-word activation when the word handler declines',
			() => {
				const onWordActivate =
					vi.fn(() => false);
				const onLinkActivate =
					vi.fn(() => true);

				mountDocument(
					createLinkedDocument(),
					onWordActivate,
					onLinkActivate
				);

				const event = ordinaryClick();
				requireElement('a').dispatchEvent(event);

				expect(event.defaultPrevented).toBe(true);
				expect(onWordActivate).toHaveBeenCalledTimes(1);
				expect(onLinkActivate).toHaveBeenCalledWith([
					'/target'
				]);
			}
		);

		it(
			'preserves modified browser gestures without delegating word or link activation',
			() => {
				const onWordActivate =
					vi.fn(() => true);
				const onLinkActivate =
					vi.fn(() => true);

				mountDocument(
					createLinkedDocument(),
					onWordActivate,
					onLinkActivate
				);

				const event = new MouseEvent(
					'click',
					{
						bubbles: true,
						cancelable: true,
						button: 0,
						ctrlKey: true
					}
				);

				requireElement('a').dispatchEvent(event);

				expect(event.defaultPrevented).toBe(false);
				expect(onWordActivate).not.toHaveBeenCalled();
				expect(onLinkActivate).not.toHaveBeenCalled();
			}
		);
	}
);

/** Mounts one normalized document with optional host activation handlers. */
function mountDocument(
	document: NormalizedDocument,
	onWordActivate?: NormalizedContentWordActivationHandler,
	onLinkActivate?: NormalizedContentLinkHandler
): void {
	root =
		window.document.createElement(
			'div'
		);
	window.document.body.append(
		root
	);

	component = mount(
		NormalizedContentRenderer,
		{
			target: root,
			props: {
				document,
				onWordActivate,
				onLinkActivate
			}
		}
	);
}

/** Returns one required HTMLElement from the isolated renderer root. */
function requireElement(
	selector: string
): HTMLElement {
	const element =
		root?.querySelector(
			selector
		);

	if (!(element instanceof HTMLElement)) {
		throw new Error(
			`Expected element matching ${selector}.`
		);
	}

	return element;
}

/** Creates an ordinary primary-button click event. */
function ordinaryClick(): MouseEvent {
	return new MouseEvent(
		'click',
		{
			bubbles: true,
			cancelable: true,
			button: 0
		}
	);
}

/** Creates a document whose second word has canonical content index 2. */
function createDocument(): NormalizedDocument {
	return {
		blocks: [
			{
				type: 'paragraph',
				id: 'paragraph-1',
				content: [
					{
						type: 'word',
						text: 'First'
					},
					{
						type: 'anchor',
						id: 'inline-anchor'
					},
					{
						type: 'word',
						text: 'Second'
					}
				]
			}
		]
	};
}

/** Creates one linked word for activation-precedence tests. */
function createLinkedDocument(): NormalizedDocument {
	return {
		blocks: [
			{
				type: 'paragraph',
				id: 'linked-paragraph',
				content: [
					{
						type: 'word',
						text: 'Linked',
						href: ['/target']
					}
				]
			}
		]
	};
}

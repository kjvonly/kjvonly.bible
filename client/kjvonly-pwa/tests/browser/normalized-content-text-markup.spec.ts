import {
	afterEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	mount,
	unmount
} from 'svelte';

import type {
	NormalizedContentTextMarkupMap,
	NormalizedDocument
} from '$lib/domains/normalized-content';

import {
	NormalizedContentRenderer
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
	'NormalizedContentRenderer Text Markup',
	() => {
		it(
			'projects whole-word markup from blockId + canonical contentIndex',
			() => {
				mountDocument(
					createDocument(),
					{
						'paragraph-1': {
							'0': {
								class: ['bg-highlighta']
							},
							'1': {
								class: ['bg-should-not-render']
							},
							'2': {
								class: [
									'text-highlightb',
									'underline'
								]
							}
						},
						'nested-paragraph': {
							'0': {
								class: ['decoration-highlightc']
							}
						}
					}
				);

				const paragraph =
					requireElement(
						'#paragraph-1'
					);
				const firstWord =
					requireElement(
						'[data-normalized-content-kind="word"][data-normalized-content-index="0"]',
						paragraph
					);
				const anchor =
					requireElement(
						'#inline-anchor',
						paragraph
					);
				const secondWord =
					requireElement(
						'[data-normalized-content-kind="word"][data-normalized-content-index="2"]',
						paragraph
					);
				const secondSeparator =
					requireElement(
						'[data-normalized-content-kind="separator"][data-normalized-content-index="2"]',
						paragraph
					);
				const nestedWord =
					requireElement(
						'#nested-paragraph [data-normalized-content-kind="word"][data-normalized-content-index="0"]'
					);

				expect(firstWord.classList).toContain(
					'bg-highlighta'
				);
				expect(anchor.className).toBe('');
				expect(secondWord.classList).toContain(
					'text-highlightb'
				);
				expect(secondWord.classList).toContain(
					'underline'
				);
				expect(secondSeparator.classList).toContain(
					'text-highlightb'
				);
				expect(secondSeparator.classList).toContain(
					'underline'
				);
				expect(nestedWord.classList).toContain(
					'decoration-highlightc'
				);
			}
		);

		it(
			'combines canonical presentation classes with Text Markup classes on linked words',
			() => {
				mountDocument(
					{
						blocks: [
							{
								type: 'paragraph',
								id: 'paragraph-1',
								content: [
									{
										type: 'word',
										text: 'Linked',
										href: ['/target'],
										class: ['nowrap']
									}
								]
							}
						]
					},
					{
						'paragraph-1': {
							'0': {
								class: ['bg-highlighta']
							}
						}
					}
				);

				const linkedWord =
					requireElement(
						'a[data-normalized-content-kind="word"]'
					);

				expect(linkedWord.classList).toContain(
					'bg-highlighta'
				);
				expect(linkedWord.className).toContain(
					'whitespace-nowrap'
				);
			}
		);
	}
);

/** Mounts one canonical document with optional whole-word Text Markup. */
function mountDocument(
	document: NormalizedDocument,
	textMarkupMarkings?: NormalizedContentTextMarkupMap
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
				textMarkupMarkings
			}
		}
	);
}

/** Queries one required HTMLElement from the active renderer root. */
function requireElement(
	selector: string,
	scope: ParentNode = requireRoot()
): HTMLElement {
	const element =
		scope.querySelector(
			selector
		);

	if (!(element instanceof HTMLElement)) {
		throw new Error(
			`Expected element matching ${selector}.`
		);
	}

	return element;
}

/** Returns the active isolated renderer root. */
function requireRoot(): HTMLDivElement {
	if (!root) {
		throw new Error(
			'Expected mounted normalized content root.'
		);
	}

	return root;
}

/** Creates a document with an anchor gap and nested block addresses. */
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
			},
			{
				type: 'quote',
				id: 'quote-1',
				blocks: [
					{
						type: 'paragraph',
						id: 'nested-paragraph',
						content: [
							{
								type: 'word',
								text: 'Nested'
							}
						]
					}
				]
			}
		]
	};
}

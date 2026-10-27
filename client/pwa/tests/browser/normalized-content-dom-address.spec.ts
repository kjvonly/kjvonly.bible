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
	NormalizedDocument
} from '$lib/domains/normalized-content';

import {
	NormalizedContentRenderer,
	resolveNormalizedContentDomAddress
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
	'Normalized Content DOM addressing',
	() => {
		it(
			'projects canonical block identity and content indexes into rendered inline DOM',
			() => {
				mountDocument(
					createAddressedDocument()
				);

				const paragraph =
					requireElement(
						'#paragraph-1'
					);
				const firstWord =
					requireElement(
						'[data-normalized-content-index="0"]',
						paragraph
					);
				const anchor =
					requireElement(
						'#inline-anchor'
					);
				const separator =
					requireElement(
						'[data-normalized-content-index="4"]',
						paragraph
					);
				const lineBreak =
					requireElement(
						'br[data-normalized-content-index="2"]'
					);
				const markedWord =
					requireElement(
						'[data-normalized-content-index="3"]',
						paragraph
					);
				const markedTextNode =
					markedWord.querySelector(
						'mark'
					)?.firstChild;

				expect(
					paragraph.hasAttribute(
						'data-normalized-block'
					)
				).toBe(
					true
				);
				expect(
					firstWord.dataset.normalizedContentKind
				).toBe(
					'word'
				);
				expect(
					anchor.dataset.normalizedContentKind
				).toBe(
					'anchor'
				);
				expect(
					lineBreak.dataset.normalizedContentKind
				).toBe(
					'line-break'
				);
				expect(
					markedWord.dataset.normalizedContentKind
				).toBe(
					'word'
				);
				expect(
					separator.dataset.normalizedContentKind
				).toBe(
					'separator'
				);
				expect(
					resolveNormalizedContentDomAddress(
						requireRoot(),
						firstWord.firstChild ?? firstWord
					)
				).toEqual({
					blockId: 'paragraph-1',
					contentIndex: 0
				});
				expect(
					resolveNormalizedContentDomAddress(
						requireRoot(),
						anchor
					)
				).toEqual({
					blockId: 'paragraph-1',
					contentIndex: 1
				});
				expect(
					resolveNormalizedContentDomAddress(
						requireRoot(),
						lineBreak
					)
				).toEqual({
					blockId: 'paragraph-1',
					contentIndex: 2
				});
				expect(markedTextNode).toBeDefined();
				expect(
					resolveNormalizedContentDomAddress(
						requireRoot(),
						markedTextNode ?? markedWord
					)
				).toEqual({
					blockId: 'paragraph-1',
					contentIndex: 3
				});
				expect(
					resolveNormalizedContentDomAddress(
						requireRoot(),
						separator.firstChild ?? separator
					)
				).toEqual({
					blockId: 'paragraph-1',
					contentIndex: 4
				});
			}
		);

		it(
			'resolves nested inline content to its nearest owning canonical block',
			() => {
				mountDocument({
					blocks: [
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
				});

				const word =
					requireElement(
						'#nested-paragraph [data-normalized-content-index="0"]'
					);

				expect(
					resolveNormalizedContentDomAddress(
						requireRoot(),
						word.firstChild ?? word
					)
				).toEqual({
					blockId: 'nested-paragraph',
					contentIndex: 0
				});
			}
		);

		it(
			'does not resolve nodes outside the supplied rendered document root',
			() => {
				mountDocument(
					createAddressedDocument()
				);

				const outside =
					window.document.createElement(
						'span'
					);
				outside.dataset.normalizedContentIndex =
					'0';
				window.document.body.append(
					outside
				);

				expect(
					resolveNormalizedContentDomAddress(
						requireRoot(),
						outside
					)
				).toBeUndefined();

				outside.remove();
			}
		);
	}
);

/** Mounts one canonical document through the production normalized renderer. */
function mountDocument(
	document: NormalizedDocument
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
				document
			}
		}
	);
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

/** Queries one required HTMLElement from the supplied scope. */
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

/** Creates inline content whose array positions exercise all addressable DOM units. */
function createAddressedDocument(): NormalizedDocument {
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
						type: 'line-break'
					},
					{
						type: 'word',
						text: 'Marked',
						marks: [
							'highlight'
						]
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

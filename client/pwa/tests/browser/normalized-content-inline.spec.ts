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
	NormalizedContentRenderer
} from '$lib/domains/normalized-content/ui';

let target: HTMLDivElement | undefined;
let component: ReturnType<typeof mount> | undefined;

afterEach(async () => {
	if (component) {
		await unmount(
			component
		);
	}

	target?.remove();
	target = undefined;
	component = undefined;
});

describe(
	'NormalizedContentRenderer inline addressing',
	() => {
		it(
			'preserves anchor position without interrupting joinPrevious',
			() => {
				mountDocument({
					blocks: [
						{
							type:
								'paragraph',
							id:
								'paragraph-1',
							content: [
								{
									type:
										'word',
									text:
										'K'
								},
								{
									type:
										'anchor',
									id:
										'inline-anchor'
								},
								{
									type:
										'word',
									text:
										'JV',
									joinPrevious:
										true
								}
							]
						}
					]
				});

				const paragraph =
					requireParagraph();
				const anchor =
					paragraph.querySelector(
						'#inline-anchor'
					);

				expect(
					paragraph.id
				).toBe(
					'paragraph-1'
				);
				expect(
					paragraph.textContent
				).toBe(
					'KJV'
				);
				expect(
					anchor
				).toBeInstanceOf(
					HTMLSpanElement
				);
				expect(
					paragraph.children[1]
				).toBe(
					anchor
				);
			}
		);
	}
);

/** Mounts one canonical document through the production normalized renderer. */
function mountDocument(
	document: NormalizedDocument
): void {
	target =
		window.document.createElement(
			'div'
		);
	window.document.body.append(
		target
	);

	component = mount(
		NormalizedContentRenderer,
		{
			target,
			props: {
				document
			}
		}
	);
}

/** Returns the paragraph rendered by the focused inline-addressing fixture. */
function requireParagraph(): HTMLParagraphElement {
	const paragraph =
		target?.querySelector(
			'p'
		);

	if (
		!(paragraph instanceof
			HTMLParagraphElement)
	) {
		throw new Error(
			'Expected normalized paragraph.'
		);
	}

	return paragraph;
}

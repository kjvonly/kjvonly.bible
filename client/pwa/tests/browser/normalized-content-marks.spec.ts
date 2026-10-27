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
	'NormalizedContentRenderer canonical marks',
	() => {
		it(
			'renders every canonical mark in deterministic wrapper order',
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
										'marked',
									marks: [
										'superscript',
										'subscript',
										'underline',
										'strikethrough',
										'small',
										'code',
										'highlight'
									]
								}
							]
						}
					]
				});

				const markedText =
					target?.querySelector(
						'sup > sub > u > s > small > code > mark'
					);

				expect(
					markedText?.textContent
				).toBe(
					'marked'
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

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
	findNormalizedContentLocalTarget,
	NormalizedContentRenderer
} from '$lib/domains/normalized-content/ui';

const mountedComponents: Array<ReturnType<typeof mount>> = [];
const mountedRoots: HTMLDivElement[] = [];

afterEach(async () => {
	for (const component of mountedComponents) {
		await unmount(component);
	}

	for (const root of mountedRoots) {
		root.remove();
	}

	mountedComponents.length = 0;
	mountedRoots.length = 0;
});

describe(
	'Normalized Content local target addressing',
	() => {
		it(
			'scopes duplicate normalized IDs to the owning rendered document',
			() => {
				const firstRoot = mountDocument(
					createAddressedDocument()
				);
				const secondRoot = mountDocument(
					createAddressedDocument()
				);

				const firstBlock =
					findNormalizedContentLocalTarget(
						firstRoot,
						'#shared-block'
					);
				const secondBlock =
					findNormalizedContentLocalTarget(
						secondRoot,
						'#shared-block'
					);
				const firstAnchor =
					findNormalizedContentLocalTarget(
						firstRoot,
						'#shared-anchor'
					);
				const secondAnchor =
					findNormalizedContentLocalTarget(
						secondRoot,
						'#shared-anchor'
					);

				expect(firstBlock).toBe(
					firstRoot.querySelector(
						'#shared-block'
					)
				);
				expect(secondBlock).toBe(
					secondRoot.querySelector(
						'#shared-block'
					)
				);
				expect(firstAnchor).toBe(
					firstRoot.querySelector(
						'#shared-anchor'
					)
				);
				expect(secondAnchor).toBe(
					secondRoot.querySelector(
						'#shared-anchor'
					)
				);
				expect(firstBlock).not.toBe(
					secondBlock
				);
				expect(firstAnchor).not.toBe(
					secondAnchor
				);
			}
		);

		it(
			'resolves percent-encoded fragment IDs without interpreting non-local targets',
			() => {
				const root = mountDocument({
					blocks: [
						{
							type: 'paragraph',
							id: 'paragraph-1',
							content: [
								{
									type: 'anchor',
									id: 'footnote 1'
								}
							]
						}
					]
				});

				expect(
					findNormalizedContentLocalTarget(
						root,
						'#footnote%201'
					)
				).toBe(
					root.querySelector(
						'[id="footnote 1"]'
					)
				);
				expect(
					findNormalizedContentLocalTarget(
						root,
						'bibleLocationReference:50_3_16'
					)
				).toBeUndefined();
			}
		);
	}
);

/** Mounts one production renderer into an isolated document-local lookup root. */
function mountDocument(
	document: NormalizedDocument
): HTMLDivElement {
	const root = window.document.createElement(
		'div'
	);
	window.document.body.append(root);

	const component = mount(
		NormalizedContentRenderer,
		{
			target: root,
			props: {
				document
			}
		}
	);

	mountedRoots.push(root);
	mountedComponents.push(component);

	return root;
}

/** Creates a document whose snapshot-local IDs may repeat in another renderer. */
function createAddressedDocument(): NormalizedDocument {
	return {
		blocks: [
			{
				type: 'paragraph',
				id: 'shared-block',
				content: [
					{
						type: 'anchor',
						id: 'shared-anchor'
					},
					{
						type: 'word',
						text: 'Content'
					}
				]
			}
		]
	};
}

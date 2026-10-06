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
		await unmount(component);
	}

	target?.remove();
	target = undefined;
	component = undefined;
});

describe('NormalizedContentRenderer links', () => {
	it('renders the first href while delegating the complete href array', async () => {
		const onLinkActivate = vi.fn(() => true);
		const hrefs = [
			'bibleLocationReference:1_31_42',
			'/alternate-target'
		];

		mountDocument(
			createLinkedDocument(
				hrefs,
				'linked'
			),
			onLinkActivate
		);

		const link = requireLink();
		expect(link.getAttribute('href')).toBe(
			hrefs[0]
		);

		const event = new MouseEvent(
			'click',
			{
				bubbles: true,
				cancelable: true,
				button: 0
			}
		);

		link.dispatchEvent(event);
		await tick();

		expect(event.defaultPrevented).toBe(true);
		expect(onLinkActivate).toHaveBeenCalledTimes(1);
		expect(onLinkActivate).toHaveBeenCalledWith(
			hrefs
		);
	});

	it('delegates application targets without interpreting the Bible Domain', async () => {
		const onLinkActivate = vi.fn(() => true);

		mountDocument(
			createLinkedDocument(
				['bibleLocationReference:50_3_16'],
				'John 3:16'
			),
			onLinkActivate
		);

		requireLink().click();
		await tick();

		expect(onLinkActivate).toHaveBeenCalledWith([
			'bibleLocationReference:50_3_16'
		]);
	});

	it('delegates unknown targets without assigning Domain meaning', async () => {
		const onLinkActivate = vi.fn(() => true);

		mountDocument(
			createLinkedDocument(
				['custom:unrecognized-target'],
				'unknown'
			),
			onLinkActivate
		);

		requireLink().click();
		await tick();

		expect(onLinkActivate).toHaveBeenCalledWith([
			'custom:unrecognized-target'
		]);
	});

	it('keeps document-local anchors as native hrefs when no host handler is supplied', () => {
		mountDocument({
			blocks: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'word',
							text: '[1]',
							href: ['#fn1']
						}
					]
				},
				{
					type: 'text',
					id: 'fn1',
					content: [
						{
							type: 'word',
							text: 'Footnote'
						}
					]
				}
			]
		});

		const link = requireLink();
		expect(link.getAttribute('href')).toBe('#fn1');
		expect(target?.querySelector('#fn1')).not.toBeNull();
	});

	it('preserves native behavior when the host declines a link', () => {
		const onLinkActivate =
			vi.fn(() => false);

		mountDocument(
			createLinkedDocument(
				['#fn1'],
				'[1]'
			),
			onLinkActivate
		);

		const event = new MouseEvent(
			'click',
			{
				bubbles: true,
				cancelable: true,
				button: 0
			}
		);

		requireLink().dispatchEvent(event);

		expect(event.defaultPrevented).toBe(false);
		expect(onLinkActivate).toHaveBeenCalledWith([
			'#fn1'
		]);
	});

	it('delegates a local anchor when the host chooses to handle links', async () => {
		const onLinkActivate = vi.fn(() => true);

		mountDocument(
			createLinkedDocument(
				['#fn1'],
				'[1]'
			),
			onLinkActivate
		);

		const event = new MouseEvent(
			'click',
			{
				bubbles: true,
				cancelable: true,
				button: 0
			}
		);

		requireLink().dispatchEvent(event);
		await tick();

		expect(event.defaultPrevented).toBe(true);
		expect(onLinkActivate).toHaveBeenCalledWith([
			'#fn1'
		]);
	});

	it('does not leak generated inter-word spacing into link text', () => {
		mountDocument({
			blocks: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'word',
							text: 'linked',
							href: ['/target']
						},
						{
							type: 'word',
							text: 'next'
						}
					]
				}
			]
		});

		const link = requireLink();
		expect(link.textContent).toBe('linked');
		expect(target?.querySelector('p')?.textContent).toBe(
			'linked next'
		);
	});
});

function mountDocument(
	document: NormalizedDocument,
	onLinkActivate?: (
		hrefs: readonly string[]
	) => boolean
): void {
	target = window.document.createElement('div');
	window.document.body.append(target);

	component = mount(
		NormalizedContentRenderer,
		{
			target,
			props: {
				document,
				onLinkActivate
			}
		}
	);
}

function requireLink(): HTMLAnchorElement {
	const link = target?.querySelector('a');

	if (!(link instanceof HTMLAnchorElement)) {
		throw new Error('Expected normalized content link.');
	}

	return link;
}

function createLinkedDocument(
	hrefs: readonly string[],
	text: string
): NormalizedDocument {
	return {
		blocks: [
			{
				type: 'paragraph',
				content: [
					{
						type: 'word',
						text,
						href: [...hrefs]
					}
				]
			}
		]
	};
}

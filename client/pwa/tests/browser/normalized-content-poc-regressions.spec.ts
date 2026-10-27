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

import {
	NormalizedContentRenderer
} from '$lib/domains/normalized-content/ui';
import {
	POC_REGRESSION_FIXTURES
} from '$lib/domains/normalized-content/testing/poc-regression.fixtures';

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

describe('NormalizedContentRenderer POC regressions', () => {
	it('renders the Spurgeon fixture with semantic quote, nested ordered lists, and small mark', () => {
		mountFixture(0);

		expect(
		target?.querySelector('h1')?.textContent
		).toContain('THE IMMUTABILITY OF GOD');
		expect(
			target?.querySelector('blockquote')
		).not.toBeNull();
		expect(
			target?.querySelector('ol ol')
		).not.toBeNull();
		expect(
			target?.querySelector('small')?.textContent
		).toBe('th');
	});

	it('renders the Bunyan fixture with typed Bible references and superscript footnote link', () => {
		mountFixture(1);

		const bibleLink = target?.querySelector(
			'a[href="bibleLocationReference:1_31_42"]'
		);
		const footnote = target?.querySelector(
			'a[href="#fnt1"] sup'
		);

		expect(bibleLink).not.toBeNull();
		expect(footnote?.textContent).toBe('[1]');
		expect(
			bibleLink?.classList.contains(
				'blb-tagged'
			)
		).toBe(false);
		expect(
			bibleLink?.classList.contains(
				'whitespace-nowrap'
			)
		).toBe(true);
	});

	it('renders the Matthew Henry fixture with semantic heading level and typed Bible reference', () => {
		mountFixture(2);

		expect(
			target?.querySelector('h4')?.textContent
		).toBe('Chapter 1');
		expect(
			target?.querySelector(
				'a[href="bibleLocationReference:22_35_10"]'
			)
		).not.toBeNull();
	});
});

function mountFixture(index: number): void {
	const document = POC_REGRESSION_FIXTURES[index];

	if (!document) {
		throw new Error(
			`Missing POC regression fixture ${index}.`
		);
	}

	target = window.document.createElement('div');
	window.document.body.append(target);

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

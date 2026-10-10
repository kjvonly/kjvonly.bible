import {
	describe,
	expect,
	it
} from 'vitest';

import {
	isIntentionallyIgnoredHtmlElement,
	unsupportedTableSectionTags
} from './html-element-semantic-policy.js';

describe(
	'isIntentionallyIgnoredHtmlElement',
	() => {
		it.each([
			'script',
			'style',
			'noscript',
			'template'
		])(
			'classifies <%s> as an intentionally ignored subtree boundary',
			tag => {
				expect(
					isIntentionallyIgnoredHtmlElement(
						tag
					)
				).toBe(
					true
				);
			}
		);

		it(
			'is case-insensitive without treating normal supported content as ignored',
			() => {
				expect(
					isIntentionallyIgnoredHtmlElement(
						'SCRIPT'
					)
				).toBe(
					true
				);

				expect(
					isIntentionallyIgnoredHtmlElement(
						'p'
					)
				).toBe(
					false
				);
			}
		);
	}
);
describe(
	'unsupportedTableSectionTags',
	() => {
		it(
			'owns the table-section wrappers that require specialized unsupported traversal',
			() => {
				expect(
					unsupportedTableSectionTags
				).toEqual([
					'thead',
					'tbody',
					'tfoot'
				]);
			}
		);
	}
);

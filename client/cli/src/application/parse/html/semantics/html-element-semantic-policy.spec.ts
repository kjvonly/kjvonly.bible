import {
	describe,
	expect,
	it
} from 'vitest';

import {
	isIntentionallyIgnoredHtmlElement
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

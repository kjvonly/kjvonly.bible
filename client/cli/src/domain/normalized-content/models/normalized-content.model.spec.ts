import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedWord
} from './normalized-content.model.js';

describe(
	'NormalizedContent',
	() => {
		it(
			'uses sparse positive inline semantics',
			() => {
				const word:
					NormalizedWord = {
					type: 'word',
					text: 'KJV',
					emphasis: true,
					strong: true,
					href: [
						'#kjv'
					]
				};

				expect(
					word.text
				).toBe(
					'KJV'
				);
			}
		);
	}
);

// Compile-time regressions: absent semantics are represented by omission.
const falseEmphasis: NormalizedWord = {
	type: 'word',
	text: 'KJV',
	// @ts-expect-error NormalizedWord never persists explicit false emphasis.
	emphasis: false
};

const falseStrong: NormalizedWord = {
	type: 'word',
	text: 'KJV',
	// @ts-expect-error NormalizedWord never persists explicit false strong semantics.
	strong: false
};

const nullHref: NormalizedWord = {
	type: 'word',
	text: 'KJV',
	// @ts-expect-error NormalizedWord link targets are omitted instead of null.
	href: null
};

void falseEmphasis;
void falseStrong;
void nullHref;

import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedParagraphBlock
} from './normalized-block.model.js';

describe(
	'NormalizedBlock',
	() => {
		it(
			'requires canonical block identity',
			() => {
				const block:
					NormalizedParagraphBlock = {
					id: 'kjv-paragraph-1',
					type: 'paragraph',
					content: []
				};

				expect(
					block.id
				).toBe(
					'kjv-paragraph-1'
				);
			}
		);
	}
);

// Compile-time regression: canonical blocks cannot exist before identity assignment.
// @ts-expect-error NormalizedParagraphBlock requires a canonical id.
const blockWithoutId: NormalizedParagraphBlock = {
	type: 'paragraph',
	content: []
};

void blockWithoutId;

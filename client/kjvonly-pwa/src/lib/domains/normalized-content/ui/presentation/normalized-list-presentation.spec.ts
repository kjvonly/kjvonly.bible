import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedClassName,
	NormalizedListBlock
} from '@kjvonly/normalized-content';

import {
	resolveNormalizedListMarkerClass
} from './normalized-list-presentation';

function list(
	ordered: boolean,
	classes?: NormalizedClassName[]
): NormalizedListBlock {
	return {
		type:
			'list',
		id:
			'list-1',
		ordered,
		class:
			classes,
		blocks: []
	};
}

describe(
	'resolveNormalizedListMarkerClass',
	() => {
		it(
			'uses normal semantic markers by default',
			() => {
				expect(
					resolveNormalizedListMarkerClass(
						list(
							true
						)
					)
				).toBe(
					'list-decimal'
				);

				expect(
					resolveNormalizedListMarkerClass(
						list(
							false
						)
					)
				).toBe(
					'list-disc'
				);
			}
		);

		it(
			'uses canonical list style hints',
			() => {
				expect(
					resolveNormalizedListMarkerClass(
						list(
							true,
							[
								'list-roman'
							]
						)
					)
				).toBe(
					'list-[upper-roman]'
				);

				expect(
					resolveNormalizedListMarkerClass(
						list(
							true,
							[
								'list-arabic'
							]
						)
					)
				).toBe(
					'list-decimal'
				);
			}
		);

		it(
			'uses no generated bullets for unordered lists containing authored Roman or Arabic numbers',
			() => {
				for (const style of ['list-roman', 'list-arabic'] as const) {
					expect(
						resolveNormalizedListMarkerClass(list(false, [style]))
					).toBe('list-none');
				}
				// An unnumbered unordered list still receives normal bullets.
				expect(resolveNormalizedListMarkerClass(list(false))).toBe('list-disc');
			}
		);

		it(
			'returns no list marker class for non-list blocks',
			() => {
				expect(
					resolveNormalizedListMarkerClass({
						type:
							'paragraph',
						id:
							'paragraph-1',
						content: []
					})
				).toBeUndefined();
			}
		);
	}
);

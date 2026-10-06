import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedBlock
} from '../../models/normalized-block.model';

import {
	resolveNormalizedListMarkerClass
} from './normalized-list-presentation';

function list(
	ordered: boolean,
	classes?: string[],
	childClasses?: string[]
): NormalizedBlock {
	return {
		type:
			'list',
		ordered,
		class:
			classes,
		blocks: [
			{
				type:
					'list-item',
				blocks: [
					{
						type:
							'text',
						class:
							childClasses,
						content: []
					}
				]
			}
		]
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
			'uses normalized list style hints when the source has no visible markers',
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
			}
		);

		it(
			'suppresses browser markers when every list item already contains a source marker',
			() => {
				expect(
					resolveNormalizedListMarkerClass(
						list(
							true,
							[
								'list-roman'
							],
							[
								'list-marker',
								'list-marker-roman'
							]
						)
					)
				).toBe(
					'list-none'
				);
			}
		);

		it(
			'returns no list marker class for non-list blocks',
			() => {
				expect(
					resolveNormalizedListMarkerClass({
						type:
							'paragraph',
						content: []
					})
				).toBeUndefined();
			}
		);
	}
);

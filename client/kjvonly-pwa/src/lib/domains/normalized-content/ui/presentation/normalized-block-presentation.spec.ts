import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedBlock
} from '../../models/normalized-block.model';

import {
	resolveNormalizedBlockPresentation
} from './normalized-block-presentation';

describe(
	'resolveNormalizedBlockPresentation',
	() => {
		it.each([
			[
				1,
				'h1'
			],
			[
				2,
				'h2'
			],
			[
				3,
				'h3'
			],
			[
				4,
				'h4'
			],
			[
				5,
				'h5'
			],
			[
				6,
				'h6'
			]
		])(
			'preserves semantic heading level %s',
			(
				level,
				element
			) => {
				expect(
					resolveNormalizedBlockPresentation({
						type:
							'heading',
						level,
						content: []
					}).element
				).toBe(
					element
				);
			}
		);

		it.each([
			[
				'paragraph',
				'p',
				'content'
			],
			[
				'text',
				'span',
				'content'
			],
			[
				'quote',
				'blockquote',
				'blocks'
			],
			[
				'list-item',
				'li',
				'blocks'
			]
		])(
			'maps %s to semantic %s rendering',
			(
				type,
				element,
				contentKind
			) => {
				expect(
					resolveNormalizedBlockPresentation({
						type
					}).element
				).toBe(
					element
				);

				expect(
					resolveNormalizedBlockPresentation({
						type
					}).contentKind
				).toBe(
					contentKind
				);
			}
		);

		it(
			'preserves ordered and unordered list semantics',
			() => {
				expect(
					resolveNormalizedBlockPresentation({
						type:
							'list',
						ordered:
							true,
						blocks: []
					}).element
				).toBe(
					'ol'
				);

				expect(
					resolveNormalizedBlockPresentation({
						type:
							'list',
						ordered:
							false,
						blocks: []
					}).element
				).toBe(
					'ul'
				);
			}
		);

		it(
			'fails unsupported structural block types explicitly',
			() => {
				expect(
					() =>
						resolveNormalizedBlockPresentation({
							type:
								'table'
						} as NormalizedBlock)
				).toThrow(
					'Unsupported normalized block type: table'
				);
			}
		);
	}
);

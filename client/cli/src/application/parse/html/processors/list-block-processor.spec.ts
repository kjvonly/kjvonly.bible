import type {
	Element
} from 'domhandler';

import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

import {
	ListBlockProcessor
} from './list-block-processor.js';

describe(
	'ListBlockProcessor',
	() => {
		it.each([
			[
				'ol',
				true
			],
			[
				'ul',
				false
			]
		])(
			'normalizes <%s> with ordered=%s',
			(
				tag: string,
				ordered: boolean
			) => {
				const blocks: NormalizedBlock[] = [
					{
						type:
							'list-item',
						id:
							'test-list-item',
						blocks: []
					}
				];

				const processor =
					new ListBlockProcessor();

				expect(
					processor.process(
						element(
							tag
						),
						context(
							blocks
						)
					)
				).toEqual([
					{
						type:
							'list',
						id:
							'test-list',
						ordered,
						blocks
					}
				]);
			}
		);

		it(
			'omits an empty list',
			() => {
				const processor =
					new ListBlockProcessor();

				expect(
					processor.process(
						element(
							'ul'
						),
						context([])
					)
				).toEqual([]);
			}
		);

		it(
			'rejects a non-list-item child emitted by recursive traversal',
			() => {
				const processor =
					new ListBlockProcessor();

				expect(
					() =>
						processor.process(
							element(
								'ul'
							),
							context([
								{
									type:
										'paragraph',
									id:
										'test-paragraph',
									content: []
								}
							])
						)
				).toThrow(
					'HTML <ul> produced non-list-item child paragraph.'
				);
			}
		);
	}
);

function context(
	blocks: NormalizedBlock[]
): HtmlBlockProcessorContext {
	return {
		parseBlockChildren: () => blocks,
		parseInlineChildren: () => [],
		createBlock: (_element, block) => ({
			...block,
			id: `test-${block.type}`
		})
	};
}

function element(
	name: string
): Element {
	return {
		name,
		attribs: {}
	} as Element;
}

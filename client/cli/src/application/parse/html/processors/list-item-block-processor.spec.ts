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
	ListItemBlockProcessor
} from './list-item-block-processor.js';

describe(
	'ListItemBlockProcessor',
	() => {
		it(
			'wraps recursively parsed children in a list-item block',
			() => {
				const blocks: NormalizedBlock[] = [
					{
						type:
							'text',
						id:
							'test-text',
						content: []
					}
				];

				const processor =
					new ListItemBlockProcessor();

				expect(
					processor.process(
						element(),
						context(
							blocks
						)
					)
				).toEqual([
					{
						type:
							'list-item',
						id:
							'test-list-item',
						blocks
					}
				]);
			}
		);

		it(
			'omits an empty list item',
			() => {
				const processor =
					new ListItemBlockProcessor();

				expect(
					processor.process(
						element(),
						context([])
					)
				).toEqual([]);
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

function element(): Element {
	return {
		name:
			'li',
		attribs: {}
	} as Element;
}

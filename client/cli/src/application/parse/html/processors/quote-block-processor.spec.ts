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
	QuoteBlockProcessor
} from './quote-block-processor.js';

describe(
	'QuoteBlockProcessor',
	() => {
		it(
			'wraps recursively parsed children in a quote block',
			() => {
				const blocks: NormalizedBlock[] = [
					{
						type:
							'paragraph',
						id:
							'test-paragraph',
						content: []
					}
				];

				const processor =
					new QuoteBlockProcessor();

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
							'quote',
						id:
							'test-quote',
						blocks
					}
				]);
			}
		);

		it(
			'omits an empty quote',
			() => {
				const processor =
					new QuoteBlockProcessor();

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
			'blockquote',
		attribs: {}
	} as Element;
}

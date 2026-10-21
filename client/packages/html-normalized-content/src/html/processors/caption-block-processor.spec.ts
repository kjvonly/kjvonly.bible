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
	CaptionBlockProcessor
} from './caption-block-processor.js';

describe(
	'CaptionBlockProcessor',
	() => {
		it(
			'registers both figure and table caption tags',
			() => {
				expect(
					new CaptionBlockProcessor().tags
				).toEqual([
					'figcaption',
					'caption'
				]);
			}
		);

		it(
			'wraps recursively parsed children in a caption block',
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
					new CaptionBlockProcessor();

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
							'caption',
						id:
							'test-caption',
						blocks
					}
				]);
			}
		);

		it(
			'omits an empty caption',
			() => {
				const processor =
					new CaptionBlockProcessor();

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
			'figcaption',
		attribs: {}
	} as Element;
}

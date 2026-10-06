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
} from '#domain/normalized-content/models/normalized-block.model.js';

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

import {
	FigureBlockProcessor
} from './figure-block-processor.js';

describe(
	'FigureBlockProcessor',
	() => {
		it(
			'wraps recursively parsed children in a figure block',
			() => {
				const blocks: NormalizedBlock[] = [
					{
						type:
							'caption',
						id:
							'test-caption',
						blocks: []
					}
				];

				const processor =
					new FigureBlockProcessor();

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
							'figure',
						id:
							'test-figure',
						blocks
					}
				]);
			}
		);

		it(
			'omits an empty figure',
			() => {
				const processor =
					new FigureBlockProcessor();

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
			'figure',
		attribs: {}
	} as Element;
}

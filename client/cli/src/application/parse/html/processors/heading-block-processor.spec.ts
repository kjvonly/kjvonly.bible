import type {
	Element
} from 'domhandler';

import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedContent
} from '@kjvonly/normalized-content';

import {
	HeadingBlockProcessor
} from './heading-block-processor.js';

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

describe(
	'HeadingBlockProcessor',
	() => {
		it(
			'normalizes the source heading level and inline content',
			() => {
				const content = [
					word(
						'Title'
					)
				];

				const processor =
					new HeadingBlockProcessor();

				expect(
					processor.process(
						element(
							'h3'
						),
						context(
							content
						)
					)
				).toEqual([
					{
						type:
							'heading',
						id:
							'test-heading',
						level:
							3,
						content
					}
				]);
			}
		);

		it(
			'omits a heading with no meaningful inline content',
			() => {
				const processor =
					new HeadingBlockProcessor();

				expect(
					processor.process(
						element(
							'h1'
						),
						context([])
					)
				).toEqual([]);
			}
		);
	}
);

function context(
	content: NormalizedContent[]
): HtmlBlockProcessorContext {
	return {
		parseBlockChildren: () => [],
		parseInlineChildren: () => content,
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

function word(
	text: string
): NormalizedContent {
	return {
		type:
			'word',
		text
	};
}

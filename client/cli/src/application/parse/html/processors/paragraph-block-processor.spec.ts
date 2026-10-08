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

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

import {
	ParagraphBlockProcessor
} from './paragraph-block-processor.js';

describe(
	'ParagraphBlockProcessor',
	() => {
		it(
			'normalizes inline content into a paragraph',
			() => {
				const content = [
					word(
						'Paragraph'
					)
				];

				const processor =
					new ParagraphBlockProcessor();

				expect(
					processor.process(
						element(),
						context(
							content
						)
					)
				).toEqual([
					{
						type:
							'paragraph',
						id:
							'test-paragraph',
						content
					}
				]);
			}
		);

		it(
			'omits a paragraph with no meaningful inline content',
			() => {
				const processor =
					new ParagraphBlockProcessor();

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

function element(): Element {
	return {
		name:
			'p',
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

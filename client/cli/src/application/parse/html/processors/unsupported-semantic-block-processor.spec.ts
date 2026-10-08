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
	UnsupportedSemanticBlockProcessor
} from './unsupported-semantic-block-processor.js';

describe(
	'UnsupportedSemanticBlockProcessor',
	() => {
		it.each([
			'address',
			'article',
			'aside',
			'dl',
			'dt',
			'dd',
			'footer',
			'header',
			'main',
			'nav',
			'section'
		])(
			'preserves representable descendants of unsupported semantic block <%s>',
			(tag: string) => {
				const blocks: NormalizedBlock[] = [
					{
						type: 'text',
						id: 'test-text',
						content: [
							{
								type: 'word',
								text: 'Content'
							}
						]
					}
				];

				const processor =
					new UnsupportedSemanticBlockProcessor();

				expect(
					processor.process(
						element(
							tag
						),
						context(
							blocks
						)
					)
				).toEqual(
					blocks
				);
			}
		);
	}
);

function context(
	blocks: NormalizedBlock[]
): HtmlBlockProcessorContext {
	return {
		parseBlockChildren:
			() => blocks,
		parseInlineChildren:
			() => [],
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
		attribs: {},
		children: []
	} as unknown as Element;
}

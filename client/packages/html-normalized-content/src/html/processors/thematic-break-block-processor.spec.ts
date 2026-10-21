import type {
	Element
} from 'domhandler';

import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

import {
	ThematicBreakBlockProcessor
} from './thematic-break-block-processor.js';

describe(
	'ThematicBreakBlockProcessor',
	() => {
		it(
			'normalizes an hr as an addressable thematic break',
			() => {
				const processor =
					new ThematicBreakBlockProcessor();

				expect(
					processor.process(
						element(),
						context()
					)
				).toEqual([
					{
						type:
							'thematic-break',
						id:
							'test-thematic-break',
					}
				]);
			}
		);
	}
);

function context(): HtmlBlockProcessorContext {
	return {
		parseBlockChildren: () => [],
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
			'hr',
		attribs: {}
	} as Element;
}

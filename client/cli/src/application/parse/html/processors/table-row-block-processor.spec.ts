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
	TableRowBlockProcessor
} from './table-row-block-processor.js';

describe(
	'TableRowBlockProcessor',
	() => {
		it(
			'preserves empty rows because table position is structural',
			() => {
				expect(
					new TableRowBlockProcessor()
						.process(
							element(),
							context([])
						)
				).toEqual([
					{
						type:
							'table-row',
						id:
							'test-table-row',
						blocks: []
					}
				]);
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
			'tr',
		attribs: {}
	} as Element;
}

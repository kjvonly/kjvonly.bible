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
	TableBlockProcessor
} from './table-block-processor.js';

describe(
	'TableBlockProcessor',
	() => {
		it(
			'preserves the table boundary and ordered child blocks',
			() => {
				const blocks:
					NormalizedBlock[] = [
						{
							type:
								'table-row',
							id:
								'test-table-row',
							blocks: []
						}
					];

				expect(
					new TableBlockProcessor()
						.process(
							element(),
							context(
								blocks
							)
						)
				).toEqual([
					{
						type:
							'table',
						id:
							'test-table',
						blocks
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
			'table',
		attribs: {}
	} as Element;
}

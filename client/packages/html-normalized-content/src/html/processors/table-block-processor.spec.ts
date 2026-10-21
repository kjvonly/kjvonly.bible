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
	TableBlockProcessor
} from './table-block-processor.js';

describe(
	'TableBlockProcessor',
	() => {
		it(
			'omits an empty table that carries no canonical metadata',
			() => {
				expect(
					new TableBlockProcessor()
						.process(
							element(),
							context([])
						)
				).toEqual([]);
			}
		);

		it(
			'preserves an empty table carrying canonical source identity',
			() => {
				expect(
					new TableBlockProcessor()
						.process(
							element({
								id: 'table-anchor'
							}),
							context([])
						)
				).toEqual([
					{
						type: 'table',
						id: 'test-table',
						blocks: []
					}
				]);
			}
		);

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

function element(
	attribs: Record<string, string> = {}
): Element {
	return {
		name:
			'table',
		attribs
	} as Element;
}

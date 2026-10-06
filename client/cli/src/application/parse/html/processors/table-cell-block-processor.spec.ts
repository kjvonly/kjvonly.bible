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
	TableCellBlockProcessor
} from './table-cell-block-processor.js';

describe(
	'TableCellBlockProcessor',
	() => {
		it.each([
			[
				'td',
				false
			],
			[
				'th',
				true
			]
		])(
			'normalizes <%s> with header=%s',
			(tag: string, header: boolean) => {
				expect(
					new TableCellBlockProcessor()
						.process(
							element(
								tag
							),
							context()
						)
				).toEqual([
					{
						type:
							'table-cell',
						id:
							'test-table-cell',
						header,
						blocks: []
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

function element(
	name: string
): Element {
	return {
		name,
		attribs: {}
	} as Element;
}

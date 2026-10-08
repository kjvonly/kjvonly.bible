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
	TableSectionBlockProcessor
} from './table-section-block-processor.js';

describe(
	'TableSectionBlockProcessor',
	() => {
		it.each([
			'thead',
			'tbody',
			'tfoot'
		])(
			'flattens <%s> while preserving row blocks',
			(tag: string) => {
				const rows:
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
					new TableSectionBlockProcessor()
						.process(
							element(
								tag
							),
							context(
								rows
							)
						)
				).toBe(
					rows
				);
			}
		);

		it(
			'preserves rows when the source section carries unsupported boundary semantics',
			() => {
				const rows:
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
					new TableSectionBlockProcessor()
						.process(
							element(
								'tbody',
								{
									id:
										'body-1',
									style:
										'text-align:center'
								}
							),
							context(
								rows
							)
						)
				).toBe(
					rows
				);
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
	name: string,
	attribs: Record<string, string> = {}
): Element {
	return {
		name,
		attribs
	} as Element;
}

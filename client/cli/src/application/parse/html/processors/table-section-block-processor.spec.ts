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
			'rejects an addressable section because flattening would lose its identity',
			() => {
				expect(
					() =>
						new TableSectionBlockProcessor()
							.process(
								element(
									'tbody',
									{
										id:
											'body-1'
									}
								),
								context([])
							)
				).toThrow(
					'Cannot discard addressable table section <tbody>#body-1.'
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

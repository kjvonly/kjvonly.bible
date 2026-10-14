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
	TransparentContainerBlockProcessor
} from './transparent-container-block-processor.js';

describe(
	'TransparentContainerBlockProcessor',
	() => {
		it(
			'recurses through a neutral container without materializing it',
			() => {
				const blocks: NormalizedBlock[] = [
					{
						type:
							'paragraph',
						id:
							'test-paragraph',
						content: []
					}
				];

				const processor =
					new TransparentContainerBlockProcessor();

				expect(
					processor.process(
						element(
							'div'
						),
						context(
							blocks
						)
					)
				).toBe(
					blocks
				);
			}
		);

		it('continues through wrappers whose IDs or presentation are discarded', () => {
			const blocks: NormalizedBlock[] = [{ type: 'paragraph', id: 'p', content: [] }];
			const processor = new TransparentContainerBlockProcessor();
			expect(processor.process(
				element('div', { id: 'commPhoto', class: 'text-center' }),
				context(blocks)
			)).toBe(blocks);
		});
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

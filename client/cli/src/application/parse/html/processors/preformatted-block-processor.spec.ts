import type {
	Element
} from 'domhandler';

import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	NormalizedContent
} from '#domain/normalized-content/models/normalized-content.model.js';

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

import {
	PreformattedBlockProcessor
} from './preformatted-block-processor.js';

describe(
	'PreformattedBlockProcessor',
	() => {
		it(
			'normalizes preformatted content while requesting source newline preservation',
			() => {
				const content: NormalizedContent[] = [
					{
						type:
							'word',
						text:
							'Alpha'
					},
					{
						type:
							'line-break'
					},
					{
						type:
							'word',
						text:
							'Bravo'
					}
				];

				const parseInlineChildren =
					vi.fn(
						() => content
					);

				const processor =
					new PreformattedBlockProcessor();

				expect(
					processor.process(
						element(),
						context(
							parseInlineChildren
						)
					)
				).toEqual([
					{
						type:
							'preformatted',
						id:
							'test-preformatted',
						content
					}
				]);

				expect(
					parseInlineChildren
				).toHaveBeenCalledWith(
					element(),
					{
						preservePreformattedSourceNewlines:
							true
					}
				);
			}
		);

		it(
			'omits empty preformatted content',
			() => {
				const processor =
					new PreformattedBlockProcessor();

				expect(
					processor.process(
						element(),
						context(
							() => []
						)
					)
				).toEqual([]);
			}
		);
	}
);

function context(
	parseInlineChildren: HtmlBlockProcessorContext['parseInlineChildren']
): HtmlBlockProcessorContext {
	return {
		parseBlockChildren: () => [],
		parseInlineChildren,
		createBlock: (_element, block) => ({
			...block,
			id: `test-${block.type}`
		})
	};
}

function element(): Element {
	return {
		name:
			'pre',
		attribs: {}
	} as Element;
}

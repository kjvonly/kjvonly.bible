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
							'section'
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

		it(
			'rejects an addressable container because flattening would lose identity',
			() => {
				const processor =
					new TransparentContainerBlockProcessor();

				expect(
					() =>
						processor.process(
							element(
								'div',
								{
									id:
										'anchor'
								}
							),
							context([])
						)
				).toThrow(
					'Cannot discard addressable container <div>#anchor.'
				);
			}
		);

		it(
			'rejects supported normalized presentation on a flattened container',
			() => {
				const processor =
					new TransparentContainerBlockProcessor();

				expect(
					() =>
						processor.process(
							element(
								'div',
								{
									class:
										'text-center'
								}
							),
							context([])
						)
				).toThrow(
					'Cannot discard normalized presentation on container <div>: text-center.'
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

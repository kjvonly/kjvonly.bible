import type {
	Element
} from 'domhandler';

import type {
	NormalizedBlock
} from '#domain/normalized-content/models/normalized-block.model.js';

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

import {
	shouldPreserveEmptySemanticBlock
} from '../semantics/should-preserve-empty-semantic-block.js';

import type {
	HtmlBlockProcessor
} from './html-block-processor.js';

import {
	requireNormalizedFlowBlocks
} from './normalized-block-type-guards.js';

/**
 * Preserves figure and table captions as recursive normalized caption blocks.
 *
 * Caption content is parsed structurally so inline runs and any nested semantic
 * blocks keep their original source order.
 */
export class CaptionBlockProcessor
	implements HtmlBlockProcessor {
	readonly tags = [
		'figcaption',
		'caption'
	];

	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[] {
		const blocks =
			context.parseBlockChildren(
				element
			);

		const flowBlocks =
			requireNormalizedFlowBlocks(
				blocks,
				'HTML caption'
			);

		if (
			flowBlocks.length ===
				0 &&
			!shouldPreserveEmptySemanticBlock(
				element
			)
		) {
			return [];
		}

		return [
			context.createBlock(
				element,
				{
					type:
						'caption',
					blocks:
						flowBlocks
				}
			)
		];
	}
}

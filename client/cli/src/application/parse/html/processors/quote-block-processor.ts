import type {
	Element
} from 'domhandler';

import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

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
 * Projects blockquotes into recursive normalized quote blocks.
 */
export class QuoteBlockProcessor
	implements HtmlBlockProcessor {
	readonly preservesSourceIdentity =
		true;
	readonly tags = [
		'blockquote'
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
				'HTML <blockquote>'
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
						'quote',
					blocks:
						flowBlocks
				}
			)
		];
	}
}

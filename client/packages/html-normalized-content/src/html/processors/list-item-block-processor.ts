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
 * Projects one HTML list item into a recursive normalized list-item block.
 */
export class ListItemBlockProcessor
	implements HtmlBlockProcessor {
	readonly preservesSourceIdentity =
		true;
	readonly tags = [
		'li'
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
				'HTML <li>'
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
						'list-item',
					blocks:
						flowBlocks
				}
			)
		];
	}
}

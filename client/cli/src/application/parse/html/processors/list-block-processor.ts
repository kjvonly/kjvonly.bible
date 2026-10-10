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
	requireNormalizedListItemBlocks
} from './normalized-block-type-guards.js';

/**
 * Projects ordered and unordered HTML lists into one normalized list shape.
 * Child traversal must emit only normalized list-item blocks.
 */
export class ListBlockProcessor
	implements HtmlBlockProcessor {
	readonly preservesSourceIdentity =
		true;
	readonly tags = [
		'ol',
		'ul'
	];

	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[] {
		const blocks =
			context.parseBlockChildren(
				element
			);

		const listItems =
			requireNormalizedListItemBlocks(
				blocks,
				`HTML <${element.name}>`
			);
		if (
			listItems.length ===
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
						'list',
					ordered:
						element.name.toLowerCase() ===
							'ol',
					blocks:
						listItems
				}
			)
		];
	}
}

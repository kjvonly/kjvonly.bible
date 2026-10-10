import type {
	Element
} from 'domhandler';

import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

import {
	hasMeaningfulInlineContent
} from '../inline/has-meaningful-inline-content.js';

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

import {
	shouldPreserveEmptySemanticBlock
} from '../semantics/should-preserve-empty-semantic-block.js';

import type {
	HtmlBlockProcessor
} from './html-block-processor.js';

/**
 * Projects HTML paragraphs into normalized paragraph blocks.
 */
export class ParagraphBlockProcessor
	implements HtmlBlockProcessor {
	readonly preservesSourceIdentity =
		true;
	readonly tags = [
		'p'
	];

	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[] {
		const content =
			context.parseInlineChildren(
				element
			);

		if (
			!hasMeaningfulInlineContent(
				content
			) &&
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
						'paragraph',
					content
				}
			)
		];
	}
}

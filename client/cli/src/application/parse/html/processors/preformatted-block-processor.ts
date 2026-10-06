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
	hasMeaningfulInlineContent
} from '../inline/has-meaningful-inline-content.js';

import {
	shouldPreserveEmptySemanticBlock
} from '../semantics/should-preserve-empty-semantic-block.js';

import type {
	HtmlBlockProcessor
} from './html-block-processor.js';

/**
 * Preserves preformatted line structure as inline content with explicit newlines.
 * Exact spaces, tabs, indentation, and boundary line breaks are not retained by
 * the v1 inline-content contract.
 */
export class PreformattedBlockProcessor
	implements HtmlBlockProcessor {
	readonly tags = [
		'pre'
	];

	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[] {
		const content =
			context.parseInlineChildren(
				element,
				{
					preservePreformattedSourceNewlines:
						true
				}
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
						'preformatted',
					content
				}
			)
		];
	}
}

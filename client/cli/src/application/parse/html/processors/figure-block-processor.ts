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
	requireNormalizedFigureChildren
} from './normalized-block-type-guards.js';

/**
 * Preserves a figure boundary around recursively normalized textual children.
 *
 * Non-text media is not embedded in NormalizedDocument; supported descendants
 * such as captions and paragraphs remain addressable inside the figure.
 */
export class FigureBlockProcessor
	implements HtmlBlockProcessor {
	readonly tags = [
		'figure'
	];

	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[] {
		const blocks =
			context.parseBlockChildren(
				element
			);

		const figureChildren =
			requireNormalizedFigureChildren(
				blocks,
				'HTML <figure>'
			);

		if (
			figureChildren.length ===
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
						'figure',
					blocks:
						figureChildren
				}
			)
		];
	}
}

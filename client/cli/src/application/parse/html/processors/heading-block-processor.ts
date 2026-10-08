import type {
	Element
} from 'domhandler';

import type {
	NormalizedBlock,
	NormalizedHeadingLevel
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
 * Projects HTML heading levels into normalized heading blocks.
 */
export class HeadingBlockProcessor
	implements HtmlBlockProcessor {
	readonly tags = [
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6'
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
						'heading',
					level:
						getHeadingLevel(
							element.name
						),
					content
				}
			)
		];
	}
}

/** Converts one registered heading tag into the canonical heading-level union. */
function getHeadingLevel(
	tag: string
): NormalizedHeadingLevel {
	switch (tag.toLowerCase()) {
		case 'h1':
			return 1;
		case 'h2':
			return 2;
		case 'h3':
			return 3;
		case 'h4':
			return 4;
		case 'h5':
			return 5;
		case 'h6':
			return 6;
		default:
			throw new Error(
				`Unsupported HTML heading tag: ${tag}.`
			);
	}
}

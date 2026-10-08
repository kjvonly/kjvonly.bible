import type {
	Element
} from 'domhandler';

import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

import type {
	HtmlBlockProcessor
} from './html-block-processor.js';

import {
	requireNormalizedTableChildren
} from './normalized-block-type-guards.js';

/**
 * Preserves a table boundary around normalized caption and row children.
 *
 * Table section wrappers are flattened by their own processor so the canonical
 * structure stays table -> row -> cell without carrying source-only grouping.
 */
export class TableBlockProcessor
	implements HtmlBlockProcessor {
	readonly tags = [
		'table'
	];

	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[] {
		const blocks =
			context.parseBlockChildren(
				element
			);

		const tableChildren =
			requireNormalizedTableChildren(
				blocks,
				'HTML <table>'
			);

		return [
			context.createBlock(
				element,
				{
					type:
						'table',
					blocks:
						tableChildren
				}
			)
		];
	}
}

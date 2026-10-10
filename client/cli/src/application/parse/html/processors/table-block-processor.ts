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
	shouldPreserveEmptySemanticBlock
} from '../semantics/should-preserve-empty-semantic-block.js';

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
	readonly preservesSourceIdentity =
		true;
	readonly tags = [
		'table'
	];

	/**
	 * Normalizes one table boundary around its canonical caption/row children.
	 *
	 * An otherwise-empty table is omitted unless its source boundary contributes
	 * canonical identity or supported presentation. Empty rows/cells are handled
	 * separately because their position inside a populated table is structural.
	 *
	 * @param element Source `<table>` element being normalized.
	 * @param context Converter capabilities used to normalize children and identity.
	 * @returns Zero or one canonical table block.
	 */
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

		if (
			tableChildren.length === 0 &&
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
						'table',
					blocks:
						tableChildren
				}
			)
		];
	}
}

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
	requireNormalizedFlowBlocks
} from './normalized-block-type-guards.js';

/**
 * Preserves one table cell as recursive block content and records whether the
 * source cell carries header semantics (`th`) rather than data semantics (`td`).
 */
export class TableCellBlockProcessor
	implements HtmlBlockProcessor {
	readonly tags = [
		'td',
		'th'
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
				'HTML table cell'
			);

		return [
			context.createBlock(
				element,
				{
					type:
						'table-cell',
					header:
						element.name.toLowerCase() ===
							'th',
					blocks:
						flowBlocks
				}
			)
		];
	}
}

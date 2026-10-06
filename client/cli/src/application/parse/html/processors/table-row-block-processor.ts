import type {
	Element
} from 'domhandler';

import type {
	NormalizedBlock
} from '#domain/normalized-content/models/normalized-block.model.js';

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

import type {
	HtmlBlockProcessor
} from './html-block-processor.js';

import {
	requireNormalizedTableCellBlocks
} from './normalized-block-type-guards.js';

/** Preserves one HTML table row and its ordered cell children. */
export class TableRowBlockProcessor
	implements HtmlBlockProcessor {
	readonly tags = [
		'tr'
	];

	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[] {
		const blocks =
			context.parseBlockChildren(
				element
			);

		const cells =
			requireNormalizedTableCellBlocks(
				blocks,
				'HTML <tr>'
			);

		return [
			context.createBlock(
				element,
				{
					type:
						'table-row',
					blocks:
						cells
				}
			)
		];
	}
}

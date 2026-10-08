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

/**
 * Preserves table-specific traversal through HTML section wrappers.
 *
 * NormalizedDocument v1 does not retain thead/tbody/tfoot boundaries. The
 * diagnostics layer therefore reports each wrapper as unsupported while this
 * processor keeps representable row descendants in canonical table order.
 */
export class TableSectionBlockProcessor
	implements HtmlBlockProcessor {
	readonly preservesSourceIdentity =
		false;

	readonly tags = [
		'thead',
		'tbody',
		'tfoot'
	];

	/**
	 * Flattens one table-section boundary into its normalized row descendants.
	 *
	 * @param element Source table-section element whose boundary is not canonical.
	 * @param context Converter capabilities used to normalize structural children.
	 * @returns Normalized descendants in their original source order.
	 */
	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[] {
		return context.parseBlockChildren(
			element
		);
	}
}

import type {
	Element
} from 'domhandler';

import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

import type {
	NormalizedContent
} from '@kjvonly/normalized-content';

import type {
	HtmlInlineParseOptions
} from '../inline/html-inline-parser.js';

/**
 * Semantic block payload accepted before converter-owned identity/presentation
 * metadata is assigned.
 *
 * Nested children are already canonical blocks; only the block currently being
 * materialized omits the `id` and `class` fields owned by `createBlock()`.
 */
export type NormalizedBlockCreationInput = {
	[TType in NormalizedBlock['type']]:
		Omit<
			Extract<
				NormalizedBlock,
				{
					type: TType;
				}
			>,
			'id' | 'class'
		>
}[NormalizedBlock['type']];

/**
 * Recursive conversion capabilities exposed to structural tag processors.
 *
 * Processors depend on this narrow context instead of the converter itself so
 * traversal remains converter-owned while recursive semantics stay available to
 * processors that need to walk nested blocks or inline content.
 */
export interface HtmlBlockProcessorContext {
	/**
	 * Recursively normalizes structural children while preserving source order.
	 *
	 * @param parent Structural source element whose children should be traversed.
	 * @returns Canonical blocks produced from representable descendant structure.
	 */
	parseBlockChildren(
		parent: Element
	): NormalizedBlock[];

	/**
	 * Normalizes the element's inline descendants using the shared inline parser.
	 *
	 * @param parent Source element owning the inline run.
	 * @param options Source-newline behavior for this inline parsing run.
	 * @returns Ordered canonical inline content.
	 */
	parseInlineChildren(
		parent: Element,
		options?: HtmlInlineParseOptions
	): NormalizedContent[];

	/**
	 * Finalizes one semantic block payload as a canonical identified block.
	 *
	 * @param element Source element whose identity/presentation may be projected.
	 * @param block Semantic payload produced before converter-owned identity assignment.
	 * @returns Canonical block with required identity and projected classes.
	 */
	createBlock(
		element: Element | undefined,
		block: NormalizedBlockCreationInput
	): NormalizedBlock;
}

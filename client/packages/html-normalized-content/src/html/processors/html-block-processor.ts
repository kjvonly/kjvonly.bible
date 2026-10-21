import type {
	Element
} from 'domhandler';

import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

/**
 * Strategy for projecting one or more HTML block tags into normalized blocks.
 * A processor owns only the semantics of its supported block type; traversal is
 * provided through HtmlBlockProcessorContext and remains converter-owned.
 */
export interface HtmlBlockProcessor {
	/** Lowercase HTML tags owned by this processor strategy. */
	readonly tags: readonly string[];

	/** Whether the source element boundary itself becomes canonical block identity. */
	readonly preservesSourceIdentity: boolean;

	/**
	 * Projects one structural element into zero or more normalized blocks.
	 *
	 * @param element Source element owned by this processor.
	 * @param context Converter-owned recursion and canonical block-construction capabilities.
	 * @returns Canonical blocks representing the source element's supported semantics.
	 */
	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[];
}

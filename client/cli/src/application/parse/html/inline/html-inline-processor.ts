import type {
	Element
} from 'domhandler';

import type {
	NormalizedContent
} from '@kjvonly/normalized-content';

import type {
	HtmlInlineState
} from './html-inline-state.js';

/** Result of applying one inline tag's semantics before child traversal. */
export interface HtmlInlineProcessorResult {
	/** Semantic state inherited by descendants when recursion continues. */
	state: HtmlInlineState;

	/** Whether HtmlInlineParser should descend into the element's children. */
	recurse: boolean;
}

/**
 * Strategy contract for one family of inline HTML tags.
 *
 * Processors may decorate inherited state for descendants or emit an inline unit
 * directly. Recursive traversal remains owned by HtmlInlineParser.
 */
export interface HtmlInlineTagProcessor {
	/** Lowercase inline HTML tags owned by this processor strategy. */
	readonly tags: readonly string[];

	/** Applies tag semantics and returns the state/recursion decision for children. */
	process(
		element: Element,
		state: HtmlInlineState,
		content: NormalizedContent[]
	): HtmlInlineProcessorResult;
}

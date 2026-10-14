import type {
	NormalizedClassName,
	NormalizedMark
} from '@kjvonly/normalized-content';

/**
 * Accumulated inline semantics inherited by descendants during recursive parsing.
 */
export interface HtmlInlineState {
	/** Controlled normalized presentation classes inherited by emitted words. */
	classes: Set<NormalizedClassName>;

	/** Nested link targets inherited by emitted words in source order. */
	hrefs: string[];

	/** Whether descendants are currently inside emphasis semantics. */
	emphasis: boolean;

	/** Whether descendants are currently inside strong semantics. */
	strong: boolean;

	/** Semantic inline marks inherited by emitted words. */
	marks: Set<NormalizedMark>;

	/** Optional document-local source-anchor identity resolver. */
	resolveAnchorId?: (id: string) => string;
}

/**
 * Creates isolated semantic decorator state for a new inline run.
 *
 * @returns Empty mutable class/mark sets, link stack, and emphasis/strong flags.
 */
export function createHtmlInlineState(
	resolveAnchorId?: (id: string) => string
): HtmlInlineState {
	return {
		classes:
			new Set<NormalizedClassName>(),
		hrefs:
			[],
		emphasis:
			false,
		strong:
			false,
		marks:
			new Set<NormalizedMark>(),
		resolveAnchorId
	};
}

/**
 * Clones inherited inline state before a child element applies its own semantics.
 * Mutable collections are copied so decorators cannot leak into sibling content.
 *
 * @param state Inherited decorator state shared by the enclosing inline scope.
 * @returns Independent state with copied classes, links, marks, and semantic flags.
 */
export function cloneHtmlInlineState(
	state: HtmlInlineState
): HtmlInlineState {
	return {
		classes:
			new Set(
				state.classes
			),
		hrefs: [
			...state.hrefs
		],
		emphasis:
			state.emphasis,
		strong:
			state.strong,
		marks:
			new Set(
				state.marks
			),
		resolveAnchorId: state.resolveAnchorId
	};
}

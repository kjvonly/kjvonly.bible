import type {
	NormalizedClassName,
	NormalizedMark
} from '#domain/normalized-content/vocabulary/normalized-presentation-vocabulary.js';

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
}

/** Creates fresh state for one independent inline run. */
export function createHtmlInlineState(): HtmlInlineState {
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
			new Set<NormalizedMark>()
	};
}

/**
 * Clones inherited inline state before a child element applies its own semantics.
 * Mutable collections are copied so decorators cannot leak into sibling content.
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
			)
	};
}

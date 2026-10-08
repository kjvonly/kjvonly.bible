import type {
	Element
} from 'domhandler';

import type {
	NormalizedMark
} from '@kjvonly/normalized-content';

import type {
	HtmlInlineProcessorResult,
	HtmlInlineTagProcessor
} from '../html-inline-processor.js';

import type {
	HtmlInlineState
} from '../html-inline-state.js';

/** Adds one normalized mark to descendants of the configured HTML tags. */
export class MarkInlineProcessor
	implements HtmlInlineTagProcessor {
	constructor(
		readonly tags: readonly string[],
		private readonly mark: NormalizedMark
	) {}

	process(
		_element: Element,
		state: HtmlInlineState
	): HtmlInlineProcessorResult {
		state.marks.add(
			this.mark
		);

		return {
			state,
			recurse:
				true
		};
	}
}

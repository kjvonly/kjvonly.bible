import type {
	Element
} from 'domhandler';

import type {
	HtmlInlineProcessorResult,
	HtmlInlineTagProcessor
} from '../html-inline-processor.js';

import type {
	HtmlInlineState
} from '../html-inline-state.js';

/** Marks descendants of em/i as emphasized. */
export class EmphasisInlineProcessor
	implements HtmlInlineTagProcessor {
	readonly preservesProjectedPresentation =
		true;

	readonly tags = [
		'em',
		'i'
	];

	process(
		_element: Element,
		state: HtmlInlineState
	): HtmlInlineProcessorResult {
		state.emphasis =
			true;

		return {
			state,
			recurse:
				true
		};
	}
}

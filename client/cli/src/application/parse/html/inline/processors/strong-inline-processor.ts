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

/** Marks descendants of b/strong as strong. */
export class StrongInlineProcessor
	implements HtmlInlineTagProcessor {
	readonly preservesProjectedPresentation =
		true;

	readonly tags = [
		'b',
		'strong'
	];

	process(
		_element: Element,
		state: HtmlInlineState
	): HtmlInlineProcessorResult {
		state.strong =
			true;

		return {
			state,
			recurse:
				true
		};
	}
}

import type {
	Element
} from 'domhandler';

import type {
	NormalizedContent
} from '@kjvonly/normalized-content';

import type {
	HtmlInlineProcessorResult,
	HtmlInlineTagProcessor
} from '../html-inline-processor.js';

import type {
	HtmlInlineState
} from '../html-inline-state.js';

/** Emits an explicit normalized line break for HTML br. */
export class LineBreakInlineProcessor
	implements HtmlInlineTagProcessor {
	readonly preservesProjectedPresentation =
		false;

	readonly tags = [
		'br'
	];

	process(
		_element: Element,
		state: HtmlInlineState,
		content: NormalizedContent[]
	): HtmlInlineProcessorResult {
		content.push({
			type:
				'line-break'
		});

		return {
			state,
			recurse:
				false
		};
	}
}

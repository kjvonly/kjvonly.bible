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

import {
	isSafeNormalizedLinkTarget
} from '#domain/normalized-content/links/normalized-link-target.js';

/** Adds an HTML anchor target to inherited word semantics. */
export class AnchorInlineProcessor
	implements HtmlInlineTagProcessor {
	readonly tags = [
		'a'
	];

	process(
		element: Element,
		state: HtmlInlineState
	): HtmlInlineProcessorResult {
		const href =
			element.attribs.href;

		if (
			href !== undefined &&
			isSafeNormalizedLinkTarget(
				href
			)
		) {
			state.hrefs.push(
				href
			);
		}

		return {
			state,
			recurse:
				true
		};
	}
}

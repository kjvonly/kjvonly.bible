import type {
	Element
} from 'domhandler';

import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

import type {
	HtmlBlockProcessor
} from './html-block-processor.js';

/**
 * Projects an HTML horizontal rule into a semantic thematic break.
 */
export class ThematicBreakBlockProcessor
	implements HtmlBlockProcessor {
	readonly tags = [
		'hr'
	];

	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[] {
		return [
			context.createBlock(
				element,
				{
					type:
						'thematic-break'
				}
			)
		];
	}
}

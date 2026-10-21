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
 * Recurses through neutral structural containers. Any unsupported addressability
 * or supported presentation on the discarded wrapper is reported as a warning.
 *
 * `div` is the only v1 structural wrapper treated as semantically neutral. HTML
 * sectioning/landmark elements use UnsupportedSemanticBlockProcessor so their
 * representable descendants survive while diagnostics report the lost boundary.
 */
export class TransparentContainerBlockProcessor
	implements HtmlBlockProcessor {
	readonly preservesSourceIdentity =
		false;

	readonly tags = [
		'div'
	];

	/**
	 * Flattens a neutral container and retains its representable children.
	 * Diagnostics separately describe lost wrapper identity/presentation.
	 *
	 * @param element Source `div` whose children should remain in document flow.
	 * @param context Converter capabilities used to normalize structural children.
	 * @returns Normalized descendants in their original source order.
	 */
	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[] {
		return context.parseBlockChildren(
			element
		);
	}
}

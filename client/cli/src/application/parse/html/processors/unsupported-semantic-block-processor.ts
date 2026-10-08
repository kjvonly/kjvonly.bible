import type {
	Element
} from 'domhandler';

import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

import {
	unsupportedSemanticBlockTags
} from '../semantics/html-element-semantic-policy.js';

import type {
	HtmlBlockProcessor
} from './html-block-processor.js';

/**
 * Preserves representable descendants of semantic block structures that v1 does
 * not yet model directly. The HTML diagnostics layer reports the unsupported
 * source boundary and its attributes so conversion can remain useful and auditable.
 */
export class UnsupportedSemanticBlockProcessor
	implements HtmlBlockProcessor {
	readonly preservesSourceIdentity =
		false;

	readonly tags =
		unsupportedSemanticBlockTags;

	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[] {
		return context.parseBlockChildren(
			element
		);
	}
}

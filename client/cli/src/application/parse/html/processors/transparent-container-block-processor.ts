import type {
	Element
} from 'domhandler';

import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

import {
	projectNormalizedClasses
} from '../projection/html-normalized-class-projector.js';

import type {
	HtmlBlockProcessorContext
} from '../context/html-block-processor-context.js';

import type {
	HtmlBlockProcessor
} from './html-block-processor.js';

/**
 * Recurses through deliberately neutral structural containers when discarding the
 * wrapper cannot lose addressability or supported normalized presentation.
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
	 * Flattens one neutral container only when its own canonical metadata would not
	 * be lost. Semantic structural wrappers are deliberately owned elsewhere.
	 *
	 * @param element Source `div` whose children should remain in document flow.
	 * @param context Converter capabilities used to normalize structural children.
	 * @returns Normalized descendants in their original source order.
	 */
	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[] {
		if (
			element.attribs.id
		) {
			throw new Error(
				`Cannot discard addressable container <${element.name}>#${element.attribs.id}.`
			);
		}

		const classes =
			projectNormalizedClasses(
				element
			);

		if (classes) {
			throw new Error(
				`Cannot discard normalized presentation on container <${element.name}>: ${classes.join(' ')}.`
			);
		}

		return context.parseBlockChildren(
			element
		);
	}
}

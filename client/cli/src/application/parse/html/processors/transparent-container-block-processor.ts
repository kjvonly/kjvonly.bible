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
 * Recurses through layout-only containers when discarding the wrapper cannot lose
 * addressability or supported normalized presentation semantics.
 */
export class TransparentContainerBlockProcessor
	implements HtmlBlockProcessor {
	readonly preservesSourceIdentity =
		false;

	readonly tags = [
		'address',
		'article',
		'aside',
		'div',
		'footer',
		'header',
		'main',
		'nav',
		'section'
	];

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

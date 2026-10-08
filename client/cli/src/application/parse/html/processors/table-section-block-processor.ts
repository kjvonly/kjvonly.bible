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
 * Flattens HTML table section wrappers while preserving their row children.
 *
 * The canonical table contract does not retain thead/tbody/tfoot as blocks. An
 * addressable or normalized-presentational section is rejected rather than
 * silently losing source meaning during flattening.
 */
export class TableSectionBlockProcessor
	implements HtmlBlockProcessor {
	readonly preservesSourceIdentity =
		false;

	readonly tags = [
		'thead',
		'tbody',
		'tfoot'
	];

	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[] {
		if (
			element.attribs.id
		) {
			throw new Error(
				`Cannot discard addressable table section <${element.name}>#${element.attribs.id}.`
			);
		}

		const classes =
			projectNormalizedClasses(
				element
			);

		if (classes) {
			throw new Error(
				`Cannot discard normalized presentation on table section <${element.name}>: ${classes.join(' ')}.`
			);
		}

		return context.parseBlockChildren(
			element
		);
	}
}

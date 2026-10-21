import type {
	Element
} from 'domhandler';

import type {
	NormalizedContent
} from '@kjvonly/normalized-content';

import type {
	HtmlInlineProcessorResult,
	HtmlInlineTagProcessor
} from './html-inline-processor.js';

import type {
	HtmlInlineState
} from './html-inline-state.js';

/**
 * Resolves inline HTML tags to their normalization strategy.
 *
 * Registered processors own supported inline semantics. Unregistered elements are
 * deliberately traversed so visible descendant content survives conversion; the
 * HTML diagnostics layer reports those unsupported element boundaries separately.
 * Duplicate registrations are rejected so composition cannot silently replace one
 * processor with another.
 */
export class HtmlInlineProcessorRegistry {
	/** Lowercase tag → processor mapping fixed at composition time. */
	private readonly processors =
		new Map<string, HtmlInlineTagProcessor>();

	constructor(
		processors:
			readonly HtmlInlineTagProcessor[]
	) {
		for (
			const processor of processors
		) {
			for (
				const tag of processor.tags
			) {
				if (
					this.processors.has(
						tag
					)
				) {
					throw new Error(
						`Duplicate HTML inline processor for <${tag}>.`
					);
				}

				this.processors.set(
					tag,
					processor
				);
			}
		}
	}

	/**
	 * Returns whether an inline semantic strategy is registered for the tag.
	 *
	 * @param tag HTML tag name; lookup is case-insensitive.
	 * @returns Whether composition registered an inline semantic processor.
	 */
	has(
		tag: string
	): boolean {
		return this.processors.has(
			tag.toLowerCase()
		);
	}

	/**
	 * Returns whether the registered processor can preserve projected presentation.
	 *
	 * @param tag HTML tag name; lookup is case-insensitive.
	 * @returns Whether the processor's canonical output can carry projected presentation.
	 */
	preservesProjectedPresentation(
		tag: string
	): boolean {
		return this.processors.get(
			tag.toLowerCase()
		)?.preservesProjectedPresentation ===
			true;
	}

	/**
	 * Applies a registered strategy or transparently preserves unsupported descendants.
	 *
	 * @param element Source inline element at the current traversal boundary.
	 * @param state Inherited inline state entering that boundary.
	 * @param content Ordered canonical content receiving direct processor emissions.
	 * @returns State and recursion decision consumed by HtmlInlineParser.
	 */
	process(
		element: Element,
		state: HtmlInlineState,
		content: NormalizedContent[]
	): HtmlInlineProcessorResult {
		const processor =
			this.processors.get(
				element.name.toLowerCase()
			);

		if (processor) {
			return processor.process(
				element,
				state,
				content
			);
		}

		// Unknown element boundaries are not assumed semantically neutral. We keep
		// traversing only so representable descendant content survives; diagnostics
		// report the unsupported source element and its attributes to the user.
		return {
			state,
			recurse:
				true
		};
	}
}

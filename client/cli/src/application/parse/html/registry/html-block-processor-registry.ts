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
} from '../processors/html-block-processor.js';


/**
 * Resolves structural HTML tags to their normalization strategy.
 *
 * Keeping tag dispatch in a registry makes additional semantic structures
 * additive: new processors can be introduced without changing traversal logic.
 */
export class HtmlBlockProcessorRegistry {
	/** Lowercase structural tag → processor mapping fixed at composition time. */
	private readonly processors =
		new Map<string, HtmlBlockProcessor>();

	constructor(
		processors:
			readonly HtmlBlockProcessor[]
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
						`Duplicate HTML block processor for <${tag}>.`
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
	 * Returns whether a structural strategy is registered for the supplied tag.
	 *
	 * @param tag Lowercase structural HTML tag.
	 * @returns Whether composition registered a block processor for the tag.
	 */
	has(
		tag: string
	): boolean {
		return this.processors.has(
			tag
		);
	}

	/**
	 * Returns whether the processor preserves the element boundary as block identity.
	 *
	 * @param tag Lowercase structural HTML tag.
	 * @returns Whether source identity on that element can survive normalization.
	 */
	preservesSourceIdentity(
		tag: string
	): boolean {
		const processor =
			this.processors.get(
				tag
			);

		return (
			processor !==
				undefined &&
			processor.preservesSourceIdentity !==
				false
		);
	}

	/**
	 * Delegates an element to the processor registered for its lowercase tag.
	 * Missing registrations are treated as converter defects rather than silently
	 * flattening structural meaning.
	 *
	 * @param element Structural source element to normalize.
	 * @param context Converter-owned recursion and canonical construction capabilities.
	 * @returns Canonical blocks produced by the registered strategy.
	 */
	process(
		element: Element,
		context: HtmlBlockProcessorContext
	): NormalizedBlock[] {
		const tag =
			element.name.toLowerCase();

		const processor =
			this.processors.get(
				tag
			);

		if (!processor) {
			throw new Error(
				`No HTML block processor registered for <${tag}>.`
			);
		}

		return processor.process(
			element,
			context
		);
	}
}

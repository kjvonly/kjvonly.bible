import type {
	Element
} from 'domhandler';

import type {
	NormalizedBlock
} from '#domain/normalized-content/models/normalized-block.model.js';

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

	/** Returns whether a structural strategy is registered for the supplied tag. */
	has(
		tag: string
	): boolean {
		return this.processors.has(
			tag
		);
	}

	/** Returns whether the processor preserves the element boundary as block identity. */
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

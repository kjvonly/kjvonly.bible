import type {
	NormalizedClassName,
	NormalizedMark
} from '../vocabulary/normalized-presentation-vocabulary.js';

/** Addressable visible word/token plus its normalized inline semantics. */
export interface NormalizedWord {
	/** Discriminator for an addressable textual inline unit. */
	type: 'word';

	/** Non-empty visible token text with punctuation attached and no canonical whitespace. */
	text: string;

	/**
	 * Render directly after the preceding word because no source whitespace
	 * separated the two semantic token fragments.
	 */
	joinPrevious?: true;

	/** Controlled presentation classes inherited from source semantics. */
	class?: NormalizedClassName[];

	/** One or more safe opaque link targets; absence means the token is not linked. */
	href?: string[];

	/** Present only when the token carries emphasis semantics. */
	emphasis?: true;

	/** Present only when the token carries strong semantics. */
	strong?: true;

	/** Additional controlled inline semantics such as superscript or code. */
	marks?: NormalizedMark[];
}

/** Zero-width document-local target preserved at its exact inline source position. */
export interface NormalizedAnchor {
	/** Discriminator for a non-visible inline identity boundary. */
	type: 'anchor';

	/** Source-authored document-local identity targeted by links such as `#fn1`. */
	id: string;
}

/** Explicit line boundary preserved in the canonical inline sequence. */
export interface NormalizedLineBreak {
	/** Discriminator for a non-word inline line boundary. */
	type: 'line-break';
}

/** Every legal inline unit in canonical source order. */
export type NormalizedContent =
	| NormalizedWord
	| NormalizedAnchor
	| NormalizedLineBreak;

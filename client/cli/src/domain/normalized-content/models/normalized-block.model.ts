import type {
	NormalizedContent
} from './normalized-content.model.js';

import type {
	NormalizedClassName
} from '../vocabulary/normalized-presentation-vocabulary.js';

/** Fields shared by every normalized block regardless of structural role. */
export interface NormalizedBlockBase {
	/** Stable block identity used by persistent document addressing. */
	id: string;

	/** Controlled source-independent presentation classes. */
	class?: NormalizedClassName[];
}

/** Heading level preserved from the normalized source structure. */
export type NormalizedHeadingLevel =
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6;

/** Heading block with a required semantic level and inline content. */
export interface NormalizedHeadingBlock
	extends NormalizedBlockBase {
	/** Discriminator for a semantic heading. */
	type: 'heading';

	/** Canonical heading depth, constrained to HTML-style levels 1 through 6. */
	level: NormalizedHeadingLevel;

	/** Ordered inline content rendered within the heading. */
	content: NormalizedContent[];
}

/** Paragraph block containing canonical inline content. */
export interface NormalizedParagraphBlock
	extends NormalizedBlockBase {
	/** Discriminator for a semantic paragraph. */
	type: 'paragraph';

	/** Ordered inline content rendered within the paragraph. */
	content: NormalizedContent[];
}

/** Synthetic flow block for inline runs that occur outside a semantic leaf block. */
export interface NormalizedTextBlock
	extends NormalizedBlockBase {
	/** Discriminator for a synthetic inline-run flow block. */
	type: 'text';

	/** Ordered inline content collected between neighboring structural blocks. */
	content: NormalizedContent[];
}

/** Preformatted text block whose explicit source line boundaries are preserved inline. */
export interface NormalizedPreformattedBlock
	extends NormalizedBlockBase {
	/** Discriminator for preformatted textual content. */
	type: 'preformatted';

	/** Ordered inline content whose explicit source line boundaries are preserved. */
	content: NormalizedContent[];
}

/** Semantic section boundary corresponding to a thematic break. */
export interface NormalizedThematicBreakBlock
	extends NormalizedBlockBase {
	/** Discriminator for a semantic thematic/section break. */
	type: 'thematic-break';
}

/** Recursive quotation container owning ordinary flow blocks. */
export interface NormalizedQuoteBlock
	extends NormalizedBlockBase {
	/** Discriminator for a recursive quotation container. */
	type: 'quote';

	/** Ordered ordinary-flow children contained by the quotation. */
	blocks: NormalizedFlowBlock[];
}

/** Ordered or unordered list owning only contextual list-item children. */
export interface NormalizedListBlock
	extends NormalizedBlockBase {
	/** Discriminator for an ordered or unordered list container. */
	type: 'list';

	/** True for ordered lists; false for unordered lists. */
	ordered: boolean;

	/** Ordered contextual list-item children. */
	blocks: NormalizedListItemBlock[];
}

/** Context-only list item whose contents return to ordinary document flow. */
export interface NormalizedListItemBlock
	extends NormalizedBlockBase {
	/** Discriminator for a contextual list child. */
	type: 'list-item';

	/** Ordered ordinary-flow content belonging to this list item. */
	blocks: NormalizedFlowBlock[];
}

/** Figure boundary containing ordinary flow plus contextual caption children. */
export interface NormalizedFigureBlock
	extends NormalizedBlockBase {
	/** Discriminator for a recursive figure boundary. */
	type: 'figure';

	/** Ordered flow/caption children contained by the figure. */
	blocks: Array<
		| NormalizedFlowBlock
		| NormalizedCaptionBlock
	>;
}

/** Context-only caption containing ordinary flow content. */
export interface NormalizedCaptionBlock
	extends NormalizedBlockBase {
	/** Discriminator for a contextual figure/table caption. */
	type: 'caption';

	/** Ordered ordinary-flow content belonging to the caption. */
	blocks: NormalizedFlowBlock[];
}

/** Table container owning only caption and row contextual children. */
export interface NormalizedTableBlock
	extends NormalizedBlockBase {
	/** Discriminator for a structured table container. */
	type: 'table';

	/** Ordered contextual caption/row children belonging to the table. */
	blocks: Array<
		| NormalizedCaptionBlock
		| NormalizedTableRowBlock
	>;
}

/** Context-only table row owning table-cell children. */
export interface NormalizedTableRowBlock
	extends NormalizedBlockBase {
	/** Discriminator for a contextual table row. */
	type: 'table-row';

	/** Ordered table-cell children preserving source column order. */
	blocks: NormalizedTableCellBlock[];
}

/** Context-only table cell whose contents return to ordinary document flow. */
export interface NormalizedTableCellBlock
	extends NormalizedBlockBase {
	/** Discriminator for a contextual table cell. */
	type: 'table-cell';

	/** True when the source cell has header semantics (`th`); false for `td`. */
	header: boolean;

	/** Ordered ordinary-flow content contained by the cell. */
	blocks: NormalizedFlowBlock[];
}

/**
 * Blocks that participate in ordinary document flow.
 *
 * Context-only nodes such as list items, captions, rows, and cells are excluded
 * so they cannot appear at the document root or inside ordinary recursive flow.
 */
export type NormalizedFlowBlock =
	| NormalizedHeadingBlock
	| NormalizedParagraphBlock
	| NormalizedTextBlock
	| NormalizedPreformattedBlock
	| NormalizedThematicBreakBlock
	| NormalizedQuoteBlock
	| NormalizedListBlock
	| NormalizedFigureBlock
	| NormalizedTableBlock;

/** Every legal node type that may appear somewhere in a normalized block tree. */
export type NormalizedBlock =
	| NormalizedFlowBlock
	| NormalizedListItemBlock
	| NormalizedCaptionBlock
	| NormalizedTableRowBlock
	| NormalizedTableCellBlock;

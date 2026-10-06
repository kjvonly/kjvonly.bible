import type {
	NormalizedFlowBlock
} from './normalized-block.model.js';

/** Canonical structured-text document accepted by parser and renderer boundaries. */
export interface NormalizedDocument {
	/** Optional logical provenance for the source used to create this document. */
	source?: string;

	/** Ordered top-level blocks; contextual-only nodes are excluded by the type. */
	blocks: NormalizedFlowBlock[];
}

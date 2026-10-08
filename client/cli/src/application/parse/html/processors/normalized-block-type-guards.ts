import type {
	NormalizedBlock,
	NormalizedCaptionBlock,
	NormalizedFlowBlock,
	NormalizedListItemBlock,
	NormalizedTableCellBlock,
	NormalizedTableRowBlock
} from '@kjvonly/normalized-content';

/** Runtime discriminator set mirroring the NormalizedFlowBlock compile-time union. */
const flowBlockTypes:
	ReadonlySet<NormalizedBlock['type']> =
	new Set([
		'heading',
		'paragraph',
		'text',
		'preformatted',
		'thematic-break',
		'quote',
		'list',
		'figure',
		'table'
	]);

/** Identifies blocks that may participate in ordinary normalized document flow. */
export function isNormalizedFlowBlock(
	block: NormalizedBlock
): block is NormalizedFlowBlock {
	return flowBlockTypes.has(
		block.type
	);
}

/** Identifies the contextual child type owned by a normalized list. */
export function isNormalizedListItemBlock(
	block: NormalizedBlock
): block is NormalizedListItemBlock {
	return block.type ===
		'list-item';
}

/** Identifies a normalized caption contextual block. */
export function isNormalizedCaptionBlock(
	block: NormalizedBlock
): block is NormalizedCaptionBlock {
	return block.type ===
		'caption';
}

/** Identifies the contextual row type owned by a normalized table. */
export function isNormalizedTableRowBlock(
	block: NormalizedBlock
): block is NormalizedTableRowBlock {
	return block.type ===
		'table-row';
}

/** Identifies the contextual cell type owned by a normalized table row. */
export function isNormalizedTableCellBlock(
	block: NormalizedBlock
): block is NormalizedTableCellBlock {
	return block.type ===
		'table-cell';
}

/** Returns ordinary-flow children or fails before a contextual block can leak in. */
export function requireNormalizedFlowBlocks(
	blocks: NormalizedBlock[],
	owner: string
): NormalizedFlowBlock[] {
	const invalid =
		blocks.find(
			block =>
				!isNormalizedFlowBlock(
					block
				)
		);

	if (invalid) {
		throw new Error(
			`${owner} produced contextual child ${invalid.type}.`
		);
	}

	return blocks.filter(
		isNormalizedFlowBlock
	);
}

/** Returns list-item children or fails when a list produced another block type. */
export function requireNormalizedListItemBlocks(
	blocks: NormalizedBlock[],
	owner: string
): NormalizedListItemBlock[] {
	const invalid =
		blocks.find(
			block =>
				!isNormalizedListItemBlock(
					block
				)
		);

	if (invalid) {
		throw new Error(
			`${owner} produced non-list-item child ${invalid.type}.`
		);
	}

	return blocks.filter(
		isNormalizedListItemBlock
	);
}

/** Returns table children while enforcing the canonical caption-or-row grammar. */
export function requireNormalizedTableChildren(
	blocks: NormalizedBlock[],
	owner: string
): Array<
	| NormalizedCaptionBlock
	| NormalizedTableRowBlock
> {
	const isTableChild =
		(block: NormalizedBlock): block is
			| NormalizedCaptionBlock
			| NormalizedTableRowBlock =>
			isNormalizedCaptionBlock(
				block
			) ||
			isNormalizedTableRowBlock(
				block
			);

	const invalid =
		blocks.find(
			block =>
				!isTableChild(
					block
				)
		);

	if (invalid) {
		throw new Error(
			`${owner} produced invalid table child ${invalid.type}.`
		);
	}

	return blocks.filter(
		isTableChild
	);
}

/** Returns table-cell children or fails when a row produced another block type. */
export function requireNormalizedTableCellBlocks(
	blocks: NormalizedBlock[],
	owner: string
): NormalizedTableCellBlock[] {
	const invalid =
		blocks.find(
			block =>
				!isNormalizedTableCellBlock(
					block
				)
		);

	if (invalid) {
		throw new Error(
			`${owner} produced non-table-cell child ${invalid.type}.`
		);
	}

	return blocks.filter(
		isNormalizedTableCellBlock
	);
}

/** Returns figure children while allowing ordinary flow plus a contextual caption. */
export function requireNormalizedFigureChildren(
	blocks: NormalizedBlock[],
	owner: string
): Array<
	| NormalizedFlowBlock
	| NormalizedCaptionBlock
> {
	const isFigureChild =
		(block: NormalizedBlock): block is
			| NormalizedFlowBlock
			| NormalizedCaptionBlock =>
			isNormalizedFlowBlock(
				block
			) ||
			isNormalizedCaptionBlock(
				block
			);

	const invalid =
		blocks.find(
			block =>
				!isFigureChild(
					block
				)
		);

	if (invalid) {
		throw new Error(
			`${owner} produced invalid figure child ${invalid.type}.`
		);
	}

	return blocks.filter(
		isFigureChild
	);
}

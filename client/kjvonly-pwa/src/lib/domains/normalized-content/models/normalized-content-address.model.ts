import type {
	NormalizedBlock,
	NormalizedContent,
	NormalizedDocument
} from '@kjvonly/normalized-content';

/**
 * Snapshot-local address of one canonical inline content entry.
 *
 * `contentIndex` is the entry's exact index in the owning block's canonical
 * `content[]`. It is not a derived visible-word index and does not imply
 * cross-revision identity.
 */
export interface NormalizedContentAddress {
	/** Exact canonical block identity containing the inline content entry. */
	readonly blockId: string;

	/** Exact index inside the owning block's canonical `content[]`. */
	readonly contentIndex: number;
}

/**
 * Resolves one semantic Normalized Content address against a document snapshot.
 *
 * This helper is DOM-independent so features such as Text Markup can validate
 * semantic targets without depending on renderer structure or browser state.
 *
 * @param document Canonical NormalizedDocument snapshot that owns the address.
 * @param address Snapshot-local block/content address to resolve.
 * @returns Canonical inline entry at the address, or undefined when unresolved.
 */
export function resolveNormalizedContentAtAddress(
	document: NormalizedDocument,
	address: NormalizedContentAddress
): NormalizedContent | undefined {
	if (
		!Number.isInteger(
			address.contentIndex
		) ||
		address.contentIndex < 0
	) {
		return undefined;
	}

	const block =
		findNormalizedBlock(
			document.blocks,
			address.blockId
		);

	if (
		!block ||
		!('content' in block)
	) {
		return undefined;
	}

	return block.content[
		address.contentIndex
	];
}

/**
 * Finds one canonical block by exact document-local block identity.
 *
 * @param blocks Canonical block sequence to search recursively.
 * @param blockId Exact block identity to locate.
 */
function findNormalizedBlock(
	blocks: readonly NormalizedBlock[],
	blockId: string
): NormalizedBlock | undefined {
	for (const block of blocks) {
		if (block.id === blockId) {
			return block;
		}

		if ('blocks' in block) {
			const child =
				findNormalizedBlock(
					block.blocks,
					blockId
				);

			if (child) {
				return child;
			}
		}
	}

	return undefined;
}

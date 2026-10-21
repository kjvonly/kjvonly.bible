import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

/** Generated-address algorithm version embedded in every generated block ID. */
const GENERATED_ID_VERSION =
	'v1';

/**
 * Assigns document-local block IDs using per-type ordinals in traversal order.
 *
 * Unique source-authored IDs are preserved verbatim. Blocks without source IDs receive
 * a per-block-type ordinal such as `nd-v1-paragraph-1`. Generated IDs are not
 * content fingerprints and are not expected to survive reparsing after source
 * structure changes.
 */
export class OrdinalNormalizedBlockIdGenerator {
	/** Authored IDs reserved before generated identity is assigned. */
	private readonly reservedSourceIds =
		new Set<string>();

	/** Authored IDs occurring more than once when regeneration is enabled. */
	private readonly duplicateSourceIds =
		new Set<string>();

	/** Highest ordinal assigned to generated zero-width inline anchors. */
	private generatedAnchorCount = 0;

	/** Highest generated ordinal assigned for each normalized block type. */
	private readonly generatedCounts =
		new Map<NormalizedBlock['type'], number>();

	/**
	 * Reserves source IDs before generated IDs are assigned so block ordinals skip
	 * addresses already owned by canonical source identity.
	 *
	 * @param ids Source-authored block IDs that survive normalization.
	 * @param description Source-specific diagnostic label when IDs collide.
	 * @param duplicatePolicy Whether duplicate authored IDs are rejected or regenerated.
	 */
	reserveSourceIds(
		ids: readonly string[],
		description = 'HTML id',
		duplicatePolicy: 'reject' | 'regenerate' = 'reject'
	): void {
		for (const id of ids) {
			if (this.reservedSourceIds.has(id)) {
				if (duplicatePolicy === 'reject') {
					throw new Error(`Duplicate ${description}: ${id}`);
				}
				this.duplicateSourceIds.add(id);
			}
			this.reservedSourceIds.add(id);
		}
	}

	/** Authored IDs for which every occurrence needs a new canonical address. */
	getDuplicateSourceIds(): ReadonlySet<string> {
		return this.duplicateSourceIds;
	}

	/** Preserves a unique inline anchor or creates a collision-free replacement. */
	createAnchorId(sourceId: string): string {
		if (!this.duplicateSourceIds.has(sourceId)) {
			return sourceId;
		}

		let candidate: string;
		do {
			this.generatedAnchorCount++;
			candidate = `nd-${GENERATED_ID_VERSION}-anchor-${this.generatedAnchorCount}`;
		} while (this.reservedSourceIds.has(candidate));
		return candidate;
	}

	/**
	 * Returns an unambiguous authored ID when present; otherwise assigns the
	 * next available generated ordinal for the canonical block type.
	 *
	 * Generated IDs skip values reserved by other source elements whose IDs can
	 * survive normalization into canonical document identity.
	 *
	 * @param type Canonical type of the block currently being created.
	 * @param sourceId ID attribute from the source HTML element currently being
	 * converted into this block.
	 * @returns The source-authored ID or the next available generated block ID.
	 */
	createId(
		type: NormalizedBlock['type'],
		sourceId?: string
	): string {
		if (sourceId && !this.duplicateSourceIds.has(sourceId)) {
			return sourceId;
		}

		let ordinal =
			(this.generatedCounts.get(
				type
			) ?? 0) + 1;

		let candidate =
			this.createGeneratedId(
				type,
				ordinal
			);

		while (
			this.reservedSourceIds.has(
				candidate
			)
		) {
			ordinal++;
			candidate =
				this.createGeneratedId(
					type,
					ordinal
				);
		}

		this.generatedCounts.set(
			type,
			ordinal
		);

		return candidate;
	}

	/** Formats one generated document-local address. */
	private createGeneratedId(
		type: NormalizedBlock['type'],
		ordinal: number
	): string {
		return `nd-${GENERATED_ID_VERSION}-${type}-${ordinal}`;
	}
}

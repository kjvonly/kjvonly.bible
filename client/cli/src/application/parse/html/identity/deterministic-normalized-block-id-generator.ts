import type {
	NormalizedBlock
} from '@kjvonly/normalized-content';

/** Generated-address algorithm version embedded in every generated block ID. */
const GENERATED_ID_VERSION =
	'v1';

/**
 * Assigns deterministic document-local block IDs in traversal order.
 *
 * Source-authored IDs are preserved verbatim. Blocks without source IDs receive
 * a per-block-type ordinal such as `nd-v1-paragraph-1`. Generated IDs are not
 * content fingerprints and are not expected to survive reparsing after source
 * structure changes.
 */
export class DeterministicNormalizedBlockIdGenerator {
	/** Canonical-preservable source IDs reserved before generated identity is assigned. */
	private readonly reservedSourceIds =
		new Set<string>();

	/** Highest generated ordinal assigned for each normalized block type. */
	private readonly generatedCounts =
		new Map<NormalizedBlock['type'], number>();

	/**
	 * Reserves every source ID that can survive normalization before generated IDs are
	 * assigned so block ordinals skip addresses already owned by canonical source identity.
	 *
	 * @param ids Source-authored HTML IDs whose elements can preserve canonical identity.
	 */
	reserveSourceIds(
		ids: readonly string[]
	): void {
		for (
			const id of ids
		) {
			if (
				this.reservedSourceIds.has(
					id
				)
			) {
				throw new Error(
					`Duplicate HTML id: ${id}`
				);
			}

			this.reservedSourceIds.add(
				id
			);
		}
	}

	/**
	 * Returns the current source element's ID when present; otherwise assigns the
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
		if (sourceId) {
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

/** One supported version of a semantic Resource payload. */
export interface SemanticTypeDefinition {
	readonly dataType: string;
	readonly dataVersion: number;
	readonly resourceType: string;
	readonly objectType: string;
	/** Rejects incompatible decoded content. Success means this version accepts it. */
	validate(value: unknown): void | Promise<void>;
}

/**
 * Maps recognized semantic data types to their versioned validators and
 * publication metadata. Recognition itself belongs to a separate classifier.
 */
export class SemanticTypeRegistry {
	private readonly definitions:
		ReadonlyMap<string, readonly SemanticTypeDefinition[]>;

	constructor(definitions: readonly SemanticTypeDefinition[]) {
		const byDataType = new Map<string, SemanticTypeDefinition[]>();

		for (const definition of definitions) {
			if (
				!definition.dataType.trim() ||
				!definition.resourceType.trim() ||
				!definition.objectType.trim() ||
				!Number.isSafeInteger(definition.dataVersion) ||
				definition.dataVersion <= 0
			) {
				throw new Error('Invalid semantic type registration.');
			}

			const versions = byDataType.get(definition.dataType) ?? [];

			if (versions.some(entry => entry.dataVersion === definition.dataVersion)) {
				throw new Error(
					`Duplicate semantic type registration: ${definition.dataType} v${definition.dataVersion}`
				);
			}

			versions.push(definition);
			byDataType.set(definition.dataType, versions);
		}

		for (const versions of byDataType.values()) {
			versions.sort((a, b) => b.dataVersion - a.dataVersion);
		}

		this.definitions = byDataType;
	}

	/** Returns supported versions newest first, without exposing the internal list. */
	versions(dataType: string): readonly SemanticTypeDefinition[] {
		return [...(this.definitions.get(dataType) ?? [])];
	}

	/**
	 * Finds the newest version accepting already-decoded content.
	 *
	 * @param dataType Semantic family claimed by a recognizer.
	 * @param value Decoded candidate; filesystem reading is owned by discovery.
	 * @throws If the family is unknown or no registered version validates.
	 */
	async resolve(dataType: string, value: unknown): Promise<SemanticTypeDefinition> {
		const versions = this.definitions.get(dataType);

		if (!versions) {
			throw new Error(`Unsupported semantic data type: ${dataType}`);
		}

		const failures: unknown[] = [];
		for (const definition of versions) {
			try {
				await definition.validate(value);
				return definition;
			} catch (error) {
				failures.push(error);
			}
		}

		throw new AggregateError(
			failures,
			`No registered version of ${dataType} accepts the content.`
		);
	}
}

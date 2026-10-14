/** File metadata discovered without loading its entire content. */
export interface ImportSourceFile {
	/** Local path used by the full-content reader and Manifest source expander. */
	readonly sourcePath: string;
	/** Canonical forward-slash path relative to the import source directory. */
	readonly relativePath: string;
	/** Source file size in bytes as stored on disk (already compressed for `.gz`). */
	readonly size: number;
}

/** Bounded content inspection supplied by the source-reading adapter. */
export interface ImportFileProbe {
	/** Reads at most `maxBytes` without requiring a full-file read. */
	readPrefix(maxBytes: number): Promise<Uint8Array>;
}

/**
 * Identifies a possible semantic family, not a validated semantic version.
 * File hints and bounded probes may produce false positives; validation follows.
 */
export interface FilesystemImportRecognizer {
	readonly name: string;
	recognize(
		file: ImportSourceFile,
		probe: ImportFileProbe
	): string | undefined | Promise<string | undefined>;
}

/** All plausible semantic families, or no semantic hints at all. */
export type FilesystemImportClassification =
	| { readonly kind: 'unrecognized' }
	| { readonly kind: 'candidates'; readonly dataTypes: readonly string[] };

/**
 * Collects possible semantic families before decoding, validation, or storage
 * policy. Recognizer registration order does not determine semantic identity.
 */
export class FilesystemImportClassifier {
	constructor(
		private readonly recognizers: readonly FilesystemImportRecognizer[]
	) {
		const names = new Set<string>();
		for (const recognizer of recognizers) {
			if (!recognizer.name.trim() || names.has(recognizer.name)) {
				throw new Error(`Invalid or duplicate import recognizer: ${recognizer.name}`);
			}
			names.add(recognizer.name);
		}
	}

	/**
	 * Collects every recognizer's plausible `dataType`, including competing
	 * families. A recognition claim is a hint, **not** proof that the file
	 * satisfies that family's contract. Multiple recognizers claiming the same
	 * family produce one candidate; neither recognizer nor registration order
	 * selects a winner.
	 *
	 * A later import workflow must decode the complete file once, validate each
	 * candidate with `SemanticTypeRegistry.resolve(dataType, value)`, and reject
	 * ambiguity only if **different families validate successfully**. Within
	 * each family the registry tries versions newest-first; when v1 and v2 both
	 * accept the file, v2 wins. Generic fallback/error policy is separate from
	 * this lightweight candidate collection step.
	 *
	 * @param file Discovered source metadata; relativePath identifies errors.
	 * @param probe Adapter-owned bounded read capability shared by recognizers.
	 * @returns Unrecognized, or unique candidate dataTypes sorted for stability.
	 * @throws When a recognizer fails or returns an empty semantic type.
	 */
	async classify(
		file: ImportSourceFile,
		probe: ImportFileProbe
	): Promise<FilesystemImportClassification> {
		const candidates = new Set<string>();

		for (const recognizer of this.recognizers) {
			let dataType: string | undefined;
			try {
				dataType = await recognizer.recognize(file, probe);
			} catch (cause) {
				throw new Error(
					`Cannot recognize "${file.relativePath}" with ${recognizer.name}.`,
					{ cause }
				);
			}

			if (dataType === undefined) continue;
			if (!dataType.trim()) {
				throw new Error(
					`Recognizer ${recognizer.name} returned an empty data type for "${file.relativePath}".`
				);
			}
			candidates.add(dataType);
		}

		if (candidates.size === 0) return { kind: 'unrecognized' };
		return { kind: 'candidates', dataTypes: [...candidates].sort() };
	}
}

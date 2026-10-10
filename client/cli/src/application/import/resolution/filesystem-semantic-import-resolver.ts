import type {
	ImportFileProbe,
	ImportSourceFile
} from '../classification/filesystem-import-classifier.js';
import { FilesystemImportClassifier } from '../classification/filesystem-import-classifier.js';
import {
	SemanticTypeRegistry,
	type SemanticTypeDefinition
} from '../../semantic/semantic-type-registry.js';

/** Full-content access is separate from the recognizers' bounded probe. */
export interface ImportContentReader extends ImportFileProbe {
	/** Reads the complete file only after at least one semantic hint matched. */
	readAll(): Promise<Uint8Array>;
}

/** A recognized family whose complete payload did not satisfy any known version. */
export interface RejectedSemanticCandidate {
	readonly dataType: string;
	readonly cause: unknown;
}

/** Result of classification followed by complete JSON semantic validation. */
export type FilesystemSemanticImportResolution =
	| { readonly kind: 'unrecognized' }
	| {
		readonly kind: 'unvalidated';
		readonly failures: readonly RejectedSemanticCandidate[];
	}
	| {
		readonly kind: 'semantic';
		readonly definition: SemanticTypeDefinition;
	};

/**
 * Validates all plausible JSON semantic families without choosing one from
 * filename hints or recognizer registration order. No Resource is built here.
 *
 * Only files with recognition candidates are read completely. Their UTF-8 JSON
 * is decoded once and passed to the Semantic Type Registry for each candidate;
 * the registry chooses the newest valid version within each family. Ambiguity
 * is an error only when more than one distinct family actually validates.
 *
 * An `unvalidated` result is deliberately NOT generic file classification.
 * The current Normalized Document directory importer rejects invalid
 * `.nd.json` candidates. A future mixed-type importer must separately decide
 * whether weak structural hints may fall back to generic Resources; this
 * resolver implements no generic fallback.
 */
export class FilesystemSemanticImportResolver {
	constructor(
		private readonly classifier: FilesystemImportClassifier,
		private readonly semanticTypes: SemanticTypeRegistry
	) {}

	/**
	 * @param file Source metadata used by recognizers and error diagnostics.
	 * @param reader Bounded probe plus lazy full-content read for validation.
	 * @returns A validated family/version, no hints, or unsuccessful candidates.
	 * @throws For I/O failure, unsupported registered claims, or more than one
	 * validated semantic family. Decoding/schema failures remain unvalidated.
	 */
	async resolve(
		file: ImportSourceFile,
		reader: ImportContentReader
	): Promise<FilesystemSemanticImportResolution> {
		const classification = await this.classifier.classify(file, reader);
		if (classification.kind === 'unrecognized') {
			return { kind: 'unrecognized' };
		}

		// A claimed-but-unregistered type is a composition error, not a failed
		// schema match to be hidden by another candidate or generic fallback.
		for (const dataType of classification.dataTypes) {
			if (this.semanticTypes.versions(dataType).length === 0) {
				throw new Error(
					`Unsupported semantic data type ${dataType} for "${file.relativePath}".`
				);
			}
		}

		let bytes: Uint8Array;
		try {
			bytes = await reader.readAll();
		} catch (cause) {
			throw new Error(`Cannot read import "${file.relativePath}".`, { cause });
		}

		let value: unknown;
		try {
			value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
		} catch (cause) {
			// A weak regex hint can match malformed JSON or unrelated content.
			// The caller decides whether this is an error for an explicit suffix.
			return {
				kind: 'unvalidated',
				failures: classification.dataTypes.map(dataType => ({ dataType, cause }))
			};
		}

		const accepted: SemanticTypeDefinition[] = [];
		const failures: RejectedSemanticCandidate[] = [];
		for (const dataType of classification.dataTypes) {
			try {
				accepted.push(await this.semanticTypes.resolve(dataType, value));
			} catch (cause) {
				failures.push({ dataType, cause });
			}
		}

		if (accepted.length > 1) {
			throw new Error(
				`Ambiguous validated semantic types for "${file.relativePath}": ` +
				accepted.map(type => `${type.dataType} v${type.dataVersion}`).sort().join('; ')
			);
		}
		const definition = accepted[0];
		if (definition !== undefined) {
			return { kind: 'semantic', definition };
		}
		return { kind: 'unvalidated', failures };
	}
}

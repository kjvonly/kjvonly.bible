import type { Manifest } from '#domain/manifest/manifest.js';
import type { ManifestBuildExecutor } from '#application/build/manifest-build-executor.js';
import type { ImportSourceFile } from '../classification/filesystem-import-classifier.js';
import type { ImportContentReader } from '../resolution/filesystem-semantic-import-resolver.js';
import { FilesystemSemanticImportResolver } from '../resolution/filesystem-semantic-import-resolver.js';
import { NormalizedDocumentManifestCompiler } from './normalized-document-manifest-compiler.js';

/** Input from a directory walker or another explicit discovery frontend. */
export interface BuildNormalizedDocumentImportRequest {
	/** Absolute source root used to resolve generated Resource paths. */
	readonly directory: string;
	/** Canonical root/mount prepended to every published Filesystem path. */
	readonly filesystemRoot: string;
	/** Validated publication configuration and current staging generation. */
	readonly manifest: Manifest;
	/** Selected source files, each with a root-relative canonical path. */
	readonly files: readonly ImportSourceFile[];
	/** Maximum original file size eligible for inline content (inclusive). */
	readonly inlineLimitBytes?: number;
}

/**
 * Validates each selected document against the registered Normalized Document
 * semantic contract, then compiles and executes one ordinary Manifest.
 *
 * No Resource staging begins until *all* selected files pass validation.
 * This use case does not walk directories, write the generated Manifest pointer,
 * or publish to Nostr/Blossom; those belong to its surrounding workflow.
 */
export class BuildNormalizedDocumentImport {
	constructor(
		private readonly resolver: FilesystemSemanticImportResolver,
		private readonly reader: (path: string) => ImportContentReader,
		private readonly compiler: NormalizedDocumentManifestCompiler,
		private readonly executor: Pick<ManifestBuildExecutor, 'build'>
	) {}

	/**
	 * @param request Source-root context, publication settings, and discovered files.
	 * @returns The compiled, validated Manifest executed by the shared builder.
	 * @throws When any file is unrecognized, invalid, or a different semantic type.
	 */
	async build(request: BuildNormalizedDocumentImportRequest): Promise<Manifest> {
		const documents = [];
		for (const file of request.files) {
			const result = await this.resolver.resolve(file, this.reader(file.sourcePath));
			if (result.kind === 'unvalidated') {
				// Recognition is only a hint. Preserve schema/JSON diagnostics so
				// callers can repair the file without debugging the registry.
				const details = result.failures.map(failure =>
					`${failure.dataType}: ${this.describeFailure(failure.cause)}`
				).join('; ');
				throw new Error(
					`File "${file.relativePath}" is not a validated Normalized Document (unvalidated): ${details}`,
					{ cause: new AggregateError(result.failures.map(failure => failure.cause), 'Semantic validation failed') }
				);
			}
			if (result.kind !== 'semantic' ||
				result.definition.dataType !== 'kjvonly.normalized-document') {
				throw new Error(`File "${file.relativePath}" is not a validated Normalized Document (${result.kind}).`);
			}
			documents.push({ file, definition: result.definition });
		}

		const manifest = this.compiler.compile({
			directory: request.directory,
			filesystemRoot: request.filesystemRoot,
			manifest: request.manifest,
			documents,
			inlineLimitBytes: request.inlineLimitBytes
		});

		await this.executor.build({
			directory: request.directory,
			manifest,
			origin: 'normalized-document-import'
		});
		return manifest;
	}

	/** Extracts the original validator messages, including rejected schema versions. */
	private describeFailure(cause: unknown): string {
		if (cause instanceof AggregateError) {
			const details = cause.errors.map((error: unknown) => this.describeFailure(error)).join('; ');
			return details ? `${cause.message}: ${details}` : cause.message;
		}
		return cause instanceof Error ? cause.message : String(cause);
	}
}

import type {
	Parse
} from '../parse.js';

import type {
	ParseSourceFile,
	ParseWorkspace
} from '#ports/parse/parse-workspace.js';

import type {
	ParseDiagnostics
} from '../diagnostics/parse-diagnostics.js';

/** Source extensions recognized by the HTML batch parser. */
const HTML_SOURCE_EXTENSIONS = [
	'.cfm',
	'.htm',
	'.html'
] as const;

/** Describes one recursive directory-normalization request. */
export interface ParseDirectoryRequest {
	/** Source representation selected for this batch. */
	readonly format: 'html' | 'legacy-normalized-document';

	/** Root directory recursively scanned for supported source files. */
	readonly directory: string;

	/** Optional HTML selector limiting conversion to the first matching root. */
	readonly rootSelector?: string;

	/** Optional output root; preserves the source hierarchy with parser-chosen filenames. */
	readonly outputDirectory?: string;

	/** Whether existing output files may be replaced. Defaults to false. */
	readonly overwrite?: boolean;
}

/** One successfully converted source file and its emitted artifact. */
export interface ParsedSourceFile {
	/** Absolute/workspace source path used for filesystem IO. */
	readonly sourcePath: string;

	/** JSON artifact path written for the normalized document. */
	readonly outputPath: string;

	/** Conversion diagnostics returned without becoming persisted document data. */
	readonly diagnostics: ParseDiagnostics;
}

/** One source file that failed independently during a batch conversion. */
export interface ParseSourceFailure {
	/** Source path whose conversion failed. */
	readonly sourcePath: string;

	/** Human-readable conversion or IO failure. */
	readonly message: string;
}

/** Aggregate result for one independently processed parse batch. */
export interface ParseDirectoryResult {
	/** Number of supported source files discovered before conversion begins. */
	readonly total: number;

	/** Number of source files successfully converted and written. */
	readonly converted: number;

	/** Number of source files that failed conversion or output. */
	readonly failed: number;

	/** Successful source/output pairs with conversion diagnostics. */
	readonly outputs: readonly ParsedSourceFile[];

	/** Per-source failures retained without aborting the remainder of the batch. */
	readonly failures: readonly ParseSourceFailure[];
}

/** Application boundary for recursively normalizing a source directory. */
export interface ParseDirectory {
	/**
	 * Processes every supported source independently and returns one batch report.
	 *
	 * @param request Source directory, optional destination, extraction, and overwrite policy.
	 * @returns Aggregate successes and per-source failures after publication attempts.
	 */
	run(
		request: ParseDirectoryRequest
	): Promise<ParseDirectoryResult>;
}

interface PlannedSourceFile {
	readonly sourceFile: ParseSourceFile;
	readonly outputPath: string;
}

/**
 * Batch-import application workflow for source documents.
 *
 * This use case owns import orchestration—not HTML interpretation. It discovers
 * source files through an injected workspace, preflights their complete output
 * plan, delegates each safe document to the canonical Parse use case, and writes
 * normalized JSON beside each HTML source, or into a separately selected output
 * tree. Legacy JSON migration always requires a distinct output filename.
 */
export class ParseDirectoryUseCase
	implements ParseDirectory {

	constructor(
		private readonly parse:
			Parse,
		private readonly workspace:
			ParseWorkspace
	) {}

	/**
	 * Preflights every discovered output before writing anything. Sources with
	 * ambiguous or protected output paths fail independently; remaining sources
	 * are still attempted so one bad document does not abort the batch.
	 *
	 * @param request Source directory, destination, extraction boundary, and overwrite intent.
	 * @returns Complete batch report after all unblocked sources are attempted.
	 */
	async run(
		request: ParseDirectoryRequest
	): Promise<ParseDirectoryResult> {
		if (
			request.format === 'legacy-normalized-document' &&
			!request.outputDirectory?.trim()
		) {
			throw new Error('Legacy JSON migration requires --output-dir to preserve source files.');
		}

		const discoveredFiles = await this.workspace.findSourceFiles(
			request.directory,
			this.getExtensions(request.format)
		);

		// Avoid reading canonical outputs on a subsequent migration run.
		const sourceFiles = request.format === 'legacy-normalized-document'
			? discoveredFiles.filter(file => !file.relativePath.toLowerCase().endsWith('.nd.json'))
			: discoveredFiles;

		const plan =
			createOutputPlan(
				sourceFiles,
				request.outputDirectory,
				this.workspace
			);

		const preflight =
			await this.preflightOutputPlan(
				plan,
				request.overwrite === true
			);

		const outputs:
			ParsedSourceFile[] = [];

		const failures:
			ParseSourceFailure[] = [
				...preflight.failures
			];

		// Preflight completes for the entire batch before this loop may write. A
		// blocked source is skipped while safe sources retain independent failures.
		for (
			const plannedSource of plan
		) {
			const sourcePath =
				plannedSource.sourceFile.path;

			if (
				preflight.blockedSourcePaths.has(
					sourcePath
				)
			) {
				continue;
			}

			try {
				const content =
					await this.workspace.readTextFile(
						sourcePath
					);

				const parseResult = request.format === 'html'
					? this.parse.run({
						format: 'html',
						content,
						rootSelector: request.rootSelector,
						source: plannedSource.sourceFile.relativePath
					})
					: this.parse.run({
						format: 'legacy-normalized-document',
						content
					});

				await this.workspace.writeOutputAtomically(
					plannedSource.outputPath,
					`${JSON.stringify(
						parseResult.document,
						null,
						2
					)}\n`,
					{
						overwrite:
							request.overwrite === true
					}
				);

				outputs.push({
					sourcePath,
					outputPath:
						plannedSource.outputPath,
					diagnostics:
						parseResult.diagnostics
				});
			}
			catch (
				error:
					unknown
			) {
				failures.push({
					sourcePath,
					message:
						getErrorMessage(
							error
						)
				});
			}
		}

		return {
			total:
				sourceFiles.length,
			converted:
				outputs.length,
			failed:
				failures.length,
			outputs,
			failures
		};
	}

	/**
	 * Detects output collisions and protected existing files for the whole plan.
	 * Nothing is written until every candidate has completed this preflight.
	 */
	private async preflightOutputPlan(
		plan: readonly PlannedSourceFile[],
		overwrite: boolean
	): Promise<{
		readonly blockedSourcePaths: ReadonlySet<string>;
		readonly failures: readonly ParseSourceFailure[];
	}> {
		const blockedSourcePaths =
			new Set<string>();

		const failures:
			ParseSourceFailure[] = [];

		const sourcesByOutputCollisionKey =
			new Map<string, PlannedSourceFile[]>();

		for (
			const plannedSource of plan
		) {
			const outputCollisionKey =
				this.workspace.getPathCollisionKey(
					plannedSource.outputPath
				);

			const sources =
				sourcesByOutputCollisionKey.get(
					outputCollisionKey
				) ?? [];

			sources.push(
				plannedSource
			);

			sourcesByOutputCollisionKey.set(
				outputCollisionKey,
				sources
			);
		}

		for (
			const collidingSources of
				sourcesByOutputCollisionKey.values()
		) {
			if (
				collidingSources.length <= 1
			) {
				continue;
			}

			const sourcePaths =
				collidingSources.map(
					plannedSource =>
						plannedSource.sourceFile.path
				);

			const outputPaths =
				[
					...new Set(
						collidingSources.map(
							plannedSource =>
								plannedSource.outputPath
						)
					)
				];

			const message =
				createOutputCollisionMessage(
					sourcePaths,
					outputPaths
				);

			for (
				const plannedSource of collidingSources
			) {
				const sourcePath =
					plannedSource.sourceFile.path;

				blockedSourcePaths.add(
					sourcePath
				);

				failures.push({
					sourcePath,
					message
				});
			}
		}

		if (
			overwrite
		) {
			return {
				blockedSourcePaths,
				failures
			};
		}

		for (
			const plannedSource of plan
		) {
			const sourcePath =
				plannedSource.sourceFile.path;

			if (
				blockedSourcePaths.has(
					sourcePath
				)
			) {
				continue;
			}

			try {
				if (
					await this.workspace.pathExists(
						plannedSource.outputPath
					)
				) {
					blockedSourcePaths.add(
						sourcePath
					);

					failures.push({
						sourcePath,
						message:
							`Output already exists: ${plannedSource.outputPath}. Existing outputs are not replaced unless overwrite is enabled.`
					});
				}
			}
			catch (
				error:
					unknown
			) {
				blockedSourcePaths.add(
					sourcePath
				);

				failures.push({
					sourcePath,
					message:
						getErrorMessage(
							error
						)
				});
			}
		}

		return {
			blockedSourcePaths,
			failures
		};
	}

	/** Resolves the source extensions owned by the requested parser format. */
	private getExtensions(
		format: ParseDirectoryRequest['format']
	): readonly string[] {
		switch (
			format
		) {
			case 'html':
				return HTML_SOURCE_EXTENSIONS;
			case 'legacy-normalized-document':
				return ['.json'];
		}
	}
}

/**
 * Describes a source-to-output ambiguity while preserving the exact emitted
 * output paths for diagnostics.
 *
 * @param sourcePaths Source files participating in the collision.
 * @param outputPaths Distinct emitted paths represented by one collision key.
 * @returns Human-readable preflight failure shared by each colliding source.
 */
function createOutputCollisionMessage(
	sourcePaths: readonly string[],
	outputPaths: readonly string[]
): string {
	if (
		outputPaths.length === 1
	) {
		return `Output path collision: ${sourcePaths.join(
			', '
		)} all map to ${outputPaths[0]}.`;
	}

	return `Output path collision: ${sourcePaths.join(
		', '
	)} map to filesystem-equivalent output paths: ${outputPaths.join(
		', '
	)}.`;
}

/** Creates the complete source-to-output mapping before conversion begins. */
function createOutputPlan(
	sourceFiles: readonly ParseSourceFile[],
	outputDirectory: string | undefined,
	workspace: ParseWorkspace
): readonly PlannedSourceFile[] {
	return sourceFiles.map(
		sourceFile => ({
			sourceFile,
			outputPath: outputDirectory === undefined
				? toOutputPath(sourceFile.path, '.json')
				: workspace.resolveDestinationOutputPath(
					outputDirectory,
					toOutputPath(sourceFile.relativePath, '.nd.json')
				)
		})
	);
}

/**
 * Chooses the parse artifact filename independently of destination path resolution.
 * In-place parsing retains the original `.json` convention; a separate output
 * tree uses the normalized-document importer's `.nd.json` convention.
 */
function toOutputPath(
	sourcePath: string,
	outputExtension: string
): string {
	return sourcePath.replace(
		/\.[^./\\]+$/,
		outputExtension
	);
}

/** Normalizes unknown thrown values into batch-reportable error text. */
function getErrorMessage(
	error: unknown
): string {
	return error instanceof Error
		? error.message
		: String(
			error
		);
}

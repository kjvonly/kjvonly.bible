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
	readonly format: 'html';

	/** Root directory recursively scanned for supported source files. */
	readonly directory: string;

	/** Optional HTML selector limiting conversion to the first matching root. */
	readonly rootSelector?: string;

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
	/** Processes every supported source independently and returns one batch report. */
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
 * normalized JSON beside the source file.
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
	 */
	async run(
		request: ParseDirectoryRequest
	): Promise<ParseDirectoryResult> {
		const sourceFiles =
			await this.workspace.findSourceFiles(
				request.directory,
				this.getExtensions(
					request.format
				)
			);

		const plan =
			createOutputPlan(
				sourceFiles
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

				const parseResult =
					this.parse.run({
						format:
							request.format,
						content,
						rootSelector:
							request.rootSelector,
						source:
							plannedSource.sourceFile.relativePath
					});

				await this.workspace.writeTextFile(
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

		const sourcesByOutputPath =
			new Map<string, PlannedSourceFile[]>();

		for (
			const plannedSource of plan
		) {
			const sources =
				sourcesByOutputPath.get(
					plannedSource.outputPath
				) ?? [];

			sources.push(
				plannedSource
			);

			sourcesByOutputPath.set(
				plannedSource.outputPath,
				sources
			);
		}

		for (
			const [
				outputPath,
				collidingSources
			] of sourcesByOutputPath
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

			const message =
				`Output path collision: ${sourcePaths.join(
					', '
				)} all map to ${outputPath}.`;

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
		}
	}
}

/** Creates the complete source-to-output mapping before conversion begins. */
function createOutputPlan(
	sourceFiles: readonly ParseSourceFile[]
): readonly PlannedSourceFile[] {
	return sourceFiles.map(
		sourceFile => ({
			sourceFile,
			outputPath:
				toOutputPath(
					sourceFile.path
				)
		})
	);
}

/**
 * Preserves the POC output convention: normalized JSON is written beside the
 * source document using the same basename and a `.json` extension.
 */
function toOutputPath(
	sourcePath: string
): string {
	return sourcePath.replace(
		/\.[^./\\]+$/,
		'.json'
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

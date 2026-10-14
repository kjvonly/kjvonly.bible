import {
	Command,
	InvalidArgumentError
} from 'commander';

import type {
	PublishManifest
} from '#application/publish/publish-manifest.js';

import type {
	SyncManifest
} from '#application/sync/sync-manifest.js';

import { BuildManifest } from '#application/build/build-manifest.js';
import type { BuildFilesystemDirectory } from '#application/import/directory/build-filesystem-directory.js';

import type {
	ParseDirectory,
	ParseDirectoryResult
} from '#application/parse/batch/parse-directory.js';

import type {
	ParseWarning
} from '#application/parse/diagnostics/parse-diagnostics.js';


export interface CliDependencies {
	readonly parseDirectory:
		ParseDirectory;

	readonly buildManifest:
	BuildManifest;

	readonly buildFilesystemDirectory:
		Pick<BuildFilesystemDirectory, 'build'>;

	readonly publishManifest:
	PublishManifest;

	readonly syncManifest:
	SyncManifest;

	readonly setVerbose:
	(
		enabled:
			boolean
	) => void;
}


export function createCli(
	dependencies:
		CliDependencies
): Command {

	const program =
		new Command();


	program
		.name('kjvonly')
		.description(
			'KJVOnly CLI'
		)
		.option(
			'-v, --verbose',
			'output verbose execution tracing'
		);


	program.hook(
		'preAction',
		(
			_thisCommand,
			actionCommand
		) => {

			const options =
				actionCommand
					.optsWithGlobals();


			dependencies.setVerbose(
				options.verbose ===
				true
			);
		}
	);


	const parseCommand =
		program
			.command('parse')
			.description(
				'Parse source documents into normalized content'
			);

	parseCommand
		.command('html')
		.description(
			'Parse HTML-family files into NormalizedDocument JSON'
		)
		.argument(
			'<directory>',
			'source directory to scan recursively'
		)
		.option(
			'--root-selector <selector>',
			'CSS selector for the document content root'
		)
		.option(
			'--output-dir <directory>',
			'write converted files to a separate directory, preserving source layout'
		)
		.option(
			'--overwrite',
			'replace existing normalized output files'
		)
		.action(
			async (
				directory:
					string,
				options:
					{
						rootSelector?: string;
						outputDir?: string;
						overwrite?: boolean;
					}
			): Promise<void> => {
				const result =
					await dependencies
						.parseDirectory
						.run({
							format:
								'html',
							directory,
							rootSelector:
								options.rootSelector,
							outputDirectory:
								options.outputDir,
							overwrite:
								options.overwrite === true
						});

				reportParseResult(
					result
				);
			}
		);


	const migrateCommand = program
		.command('migrate')
		.description('Migrate legacy documents to canonical formats')
		.addHelpText(
			'after',
			'\nRequired for normalized-document:\n  --output-dir <directory>  destination root for canonical .nd.json files\n\nExample:\n  kjvonly migrate normalized-document ./legacy-json --output-dir ./canonical-documents\n'
		);

	migrateCommand
		.command('normalized-document')
		.description('Recursively migrate first-generation normalized-document JSON to .nd.json')
		.argument('<directory>', 'directory containing legacy .json files')
		.requiredOption('--output-dir <directory>', 'destination root for canonical .nd.json files')
		.option('--overwrite', 'replace existing migrated output files')
		.action(async (
			directory: string,
			options: { outputDir: string; overwrite?: boolean }
		): Promise<void> => {
			const result = await dependencies.parseDirectory.run({
				format: 'legacy-normalized-document',
				directory,
				outputDirectory: options.outputDir,
				overwrite: options.overwrite === true
			});
			reportParseResult(result, 'Migrated');
		});

	const importCommand = program
		.command('import')
		.description('Import supported source files through the Manifest build pipeline');


	// Every discovered file is handled by its registered compiler strategy.
	importCommand
		.command('filesystem')
		.description('Recursively build and stage mixed files into one Filesystem')
		.argument('<directory>', 'source directory to scan recursively')
		.requiredOption('--manifest <path>', 'base publication manifest (YAML)')
		.requiredOption('--root <root>', 'Filesystem root/mount name')
		.requiredOption('--output-manifest <path>', 'generated publication Manifest JSON path')
		.option('--inline-limit-bytes <bytes>', 'maximum original Normalized Document size stored inline (default: 1048576)', parseInlineLimitBytes)
		.action(async (
			directory: string,
			options: { manifest: string; root: string; outputManifest: string; inlineLimitBytes?: number }
		): Promise<void> => {
			await dependencies.buildFilesystemDirectory.build({
				directory,
				manifestPath: options.manifest,
				outputManifestPath: options.outputManifest,
				filesystemRoot: options.root,
				inlineLimitBytes: options.inlineLimitBytes
			});
		});

	program
		.command('build')
		.description(
			'Build and stage Resources from a manifest'
		)
		.argument(
			'<manifest>',
			'publication manifest path'
		)
		.action(
			async (
				manifestPath:
					string
			): Promise<void> => {

				await dependencies
					.buildManifest
					.build(
						manifestPath
					);
			}
		);


	program
		.command('publish')
		.description(
			'Publish existing staged Resources'
		)
		.argument(
			'<manifest>',
			'publication manifest path'
		)
		.action(
			async (
				manifestPath:
					string
			): Promise<void> => {

				await dependencies
					.publishManifest
					.publish(
						manifestPath
					);
			}
		);


	program
		.command('sync')
		.description(
			'Build and then publish Resources'
		)
		.argument(
			'<manifest>',
			'publication manifest path'
		)
		.action(
			async (
				manifestPath:
					string
			): Promise<void> => {

				await dependencies
					.syncManifest
					.sync(
						manifestPath
					);
			}
		);


	return program;
}

/** Parses an optional byte limit without rounding or silently replacing zero. */
function parseInlineLimitBytes(value: string): number {
	if (!/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(Number(value))) {
		throw new InvalidArgumentError('expected a nonnegative safe integer (bytes)');
	}
	return Number(value);
}

/** Formats known 1-based source positions without changing warning identity. */
function formatWarningSourceLocations(
	warning: ParseWarning
): string {
	if (
		!warning.sourceLocations ||
		warning.sourceLocations.length ===
			0
	) {
		return '';
	}

	return ` [source: ${warning.sourceLocations
		.map(
			location =>
				`${location.line}:${location.column}`
		)
		.join(', ')}]`;
}

/**
 * Reports one completed parse batch at the CLI boundary. Individual conversion
 * failures are surfaced without hiding successful outputs from the same batch.
 */
function reportParseResult(
	result: ParseDirectoryResult,
	verb: 'Parsed' | 'Migrated' = 'Parsed'
): void {
	for (
		const output of result.outputs
	) {
		console.log(
			`[OK] ${output.sourcePath}`
		);
		console.log(
			`     -> ${output.outputPath}`
		);

		for (
			const warning of output.diagnostics.warnings
		) {
			console.warn(
				`[WARN] ${output.sourcePath}: ${warning.message} (${warning.count})${formatWarningSourceLocations(warning)}`
			);
		}
	}

	for (
		const failure of result.failures
	) {
		console.error(
			`[ERROR] ${failure.sourcePath}`
		);
		console.error(
			`        ${failure.message}`
		);
	}

	console.log(
		`${verb} ${result.converted}/${result.total} file(s); ${result.failed} failed.`
	);

	if (
		result.outputs.length >
			0
	) {
		const totals =
			sumParseDiagnostics(
				result
			);

		console.log(
			`Produced ${totals.blocksProduced} block(s), ${totals.wordsProduced} word(s); preserved ${totals.sourceIdsPreserved} source id(s), generated ${totals.idsGenerated} id(s), linked ${totals.linkedWordsProduced} word(s).`
		);
	}

	if (
		result.failed > 0
	) {
		process.exitCode = 1;
	}
}

interface ParseDiagnosticTotals {
	blocksProduced: number;
	wordsProduced: number;
	sourceIdsPreserved: number;
	idsGenerated: number;
	linkedWordsProduced: number;
}

/** Aggregates per-document conversion metrics for one CLI batch summary. */
function sumParseDiagnostics(
	result: ParseDirectoryResult
): ParseDiagnosticTotals {
	const totals:
		ParseDiagnosticTotals = {
			blocksProduced:
				0,
			wordsProduced:
				0,
			sourceIdsPreserved:
				0,
			idsGenerated:
				0,
			linkedWordsProduced:
				0
		};

	for (
		const output of result.outputs
	) {
		totals.blocksProduced +=
			output.diagnostics.blocksProduced;
		totals.wordsProduced +=
			output.diagnostics.wordsProduced;
		totals.sourceIdsPreserved +=
			output.diagnostics.sourceIdsPreserved;
		totals.idsGenerated +=
			output.diagnostics.idsGenerated;
		totals.linkedWordsProduced +=
			output.diagnostics.linkedWordsProduced;
	}

	return totals;
}

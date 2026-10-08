import {
	link,
	open,
	readdir,
	readFile,
	rename,
	stat,
	unlink
} from 'node:fs/promises';

import {
	basename,
	dirname,
	extname,
	join,
	normalize,
	relative,
	resolve,
	sep
} from 'node:path';

import {
	randomUUID
} from 'node:crypto';

import type {
	ParseSourceFile,
	ParseOutputWriteOptions,
	ParseWorkspace
} from '#ports/parse/parse-workspace.js';

/**
 * Node filesystem adapter used by batch parsing/import tooling.
 *
 * Directory discovery is recursive and deterministic so repeated imports walk
 * the same source tree in the same order regardless of filesystem enumeration.
 */
export class NodeParseWorkspace
	implements ParseWorkspace {

	/**
	 * Recursively discovers supported files and emits stable root-relative provenance.
	 *
	 * @param rootDirectory Root directory scanned recursively.
	 * @param extensions File extensions accepted for this parse format.
	 * @returns Deterministically ordered source files.
	 */
	async findSourceFiles(
		rootDirectory: string,
		extensions: readonly string[]
	): Promise<readonly ParseSourceFile[]> {
		const root =
			resolve(
				rootDirectory
			);

		const metadata =
			await stat(
				root
			);

		if (
			!metadata.isDirectory()
		) {
			throw new Error(
				`Parse source is not a directory: ${root}`
			);
		}

		const supportedExtensions =
			new Set(
				extensions.map(
					extension =>
						extension.toLowerCase()
				)
			);

		const files:
			string[] = [];

		await this.collectSourceFiles(
			root,
			supportedExtensions,
			files
		);

		return files.map(
			path => ({
				path,
				relativePath:
					relative(
						root,
						path
					).split(
						sep
					).join(
						'/'
					)
			})
		);
	}

	/**
	 * Creates a conservative portable comparison key without changing the path
	 * that will actually be emitted. Case folding intentionally rejects output
	 * sets that would alias on common case-insensitive filesystems even when the
	 * current host filesystem permits both names.
	 *
	 * @param path Candidate output path.
	 * @returns Normalized, case-insensitive key used only for collision checks.
	 */
	getPathCollisionKey(
		path: string
	): string {
		return normalize(
			path
		).toLowerCase();
	}

	/**
	 * Checks current filesystem existence for batch preflight only.
	 *
	 * @param path Native filesystem path to inspect.
	 * @returns Whether the path existed when stat completed.
	 */
	async pathExists(
		path: string
	): Promise<boolean> {
		try {
			await stat(
				path
			);

			return true;
		}
		catch (
			error:
				unknown
		) {
			if (
				isNodeErrorCode(
					error,
					'ENOENT'
				)
			) {
				return false;
			}

			throw error;
		}
	}

	/**
	 * Reads one complete UTF-8 source file for parser input.
	 *
	 * @param path Native filesystem path to the source document.
	 * @returns Complete UTF-8 source text.
	 */
	async readTextFile(
		path: string
	): Promise<string> {
		return readFile(
			path,
			'utf8'
		);
	}

	/**
	 * Writes a complete artifact to a same-directory temporary file before the
	 * final filesystem publication step. Non-overwrite publication uses an
	 * atomic hard-link create so a destination that appears after preflight still
	 * fails with `EEXIST`; overwrite publication uses same-filesystem rename so
	 * consumers never observe a partially written destination.
	 *
	 * @param path Final output path.
	 * @param content Complete UTF-8 artifact content.
	 * @param options Whether an existing final output may be replaced.
	 * @returns Promise resolved after the complete output is visible at `path`.
	 */
	async writeOutputAtomically(
		path: string,
		content: string,
		options: ParseOutputWriteOptions
	): Promise<void> {
		const temporaryPath =
			createTemporaryOutputPath(
				path
			);

		let temporaryFileCreated =
			false;

		try {
			const temporaryFile =
				await open(
					temporaryPath,
					'wx'
				);

			temporaryFileCreated =
				true;

			try {
				await temporaryFile.writeFile(
					content,
					{
						encoding:
							'utf8'
					}
				);

				await temporaryFile.sync();
			}
			finally {
				await temporaryFile.close();
			}

			if (
				options.overwrite
			) {
				await rename(
					temporaryPath,
					path
				);

				temporaryFileCreated =
					false;

				return;
			}

			await link(
				temporaryPath,
				path
			);
		}
		catch (
			error:
				unknown
		) {
			if (
				temporaryFileCreated
			) {
				await removeTemporaryOutputBestEffort(
					temporaryPath
				);
			}

			throw error;
		}

		if (
			temporaryFileCreated
		) {
			await removeTemporaryOutputBestEffort(
				temporaryPath
			);
		}
	}

	/**
	 * Recursively walks one directory, sorting entries before descent so batch
	 * processing order is stable across operating systems and repeated runs.
	 */
	private async collectSourceFiles(
		directory: string,
		extensions: ReadonlySet<string>,
		files: string[]
	): Promise<void> {
		const entries =
			await readdir(
				directory,
				{
					withFileTypes:
						true
				}
			);

		entries.sort(
			(left, right) =>
				left.name.localeCompare(
					right.name
				)
		);

		for (
			const entry of entries
		) {
			const path =
				join(
					directory,
					entry.name
				);

			if (
				entry.isDirectory()
			) {
				await this.collectSourceFiles(
					path,
					extensions,
					files
				);

				continue;
			}

			if (
				entry.isFile() &&
				extensions.has(
					extname(
						entry.name
					).toLowerCase()
				)
			) {
				files.push(
					path
				);
			}
		}
	}
}

/**
 * Creates a unique temporary path beside the final artifact so the publication
 * operation remains on the same filesystem as its destination.
 *
 * @param outputPath Final output path.
 * @returns Same-directory path reserved for one temporary artifact attempt.
 */
function createTemporaryOutputPath(
	outputPath: string
): string {
	return join(
		dirname(
			outputPath
		),
		`.${basename(
			outputPath
		)}.kjvonly-tmp-${randomUUID()}`
	);
}

/**
 * Best-effort cleanup for a temporary output artifact. Cleanup must not turn a
 * successfully published final artifact into a reported parse failure.
 *
 * @param temporaryPath Temporary artifact path to remove when still present.
 * @returns Promise resolved after the best-effort cleanup attempt completes.
 */
async function removeTemporaryOutputBestEffort(
	temporaryPath: string
): Promise<void> {
	try {
		await unlink(
			temporaryPath
		);
	}
	catch {
		// A complete destination may already be published. Temporary cleanup must
		// not replace the publication result with a cleanup-only failure.
	}
}

function isNodeErrorCode(
	error: unknown,
	code: string
): error is NodeJS.ErrnoException {
	return error instanceof Error &&
		'code' in error &&
		(
			error as NodeJS.ErrnoException
		).code === code;
}

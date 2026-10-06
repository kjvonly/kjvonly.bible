import {
	readdir,
	readFile,
	stat,
	writeFile
} from 'node:fs/promises';

import {
	extname,
	join,
	relative,
	resolve,
	sep
} from 'node:path';

import type {
	ParseSourceFile,
	ParseTextWriteOptions,
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

	async readTextFile(
		path: string
	): Promise<string> {
		return readFile(
			path,
			'utf8'
		);
	}

	async writeTextFile(
		path: string,
		content: string,
		options: ParseTextWriteOptions
	): Promise<void> {
		await writeFile(
			path,
			content,
			{
				encoding:
					'utf8',
				flag:
					options.overwrite
						? 'w'
						: 'wx'
			}
		);
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

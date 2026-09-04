import {
	readFile as readFileBytes,
	readdir,
	stat
} from 'node:fs/promises';

import {
	join
} from 'node:path';

import type {
	SourceDirectoryEntry,
	SourceDirectoryEntryType,
	SourcePathType,
	SourceRepository
} from '../../ports/source-repository.js';


export class NodeSourceRepository
	implements SourceRepository {

	async getPathType(
		path:
			string
	): Promise<
		SourcePathType
	> {

		try {
			const metadata =
				await stat(
					path
				);


			if (
				metadata.isFile()
			) {
				return 'file';
			}


			if (
				metadata.isDirectory()
			) {
				return 'directory';
			}


			return 'other';
		}
		catch (
			error:
				unknown
		) {
			if (
				this.isFileNotFound(
					error
				)
			) {
				return 'missing';
			}


			throw error;
		}
	}


	async readDirectory(
		path:
			string
	): Promise<
		readonly SourceDirectoryEntry[]
	> {

		const entries =
			await readdir(
				path,
				{
					withFileTypes:
						true
				}
			);


		return entries.map(
			entry => ({
				name:
					entry.name,

				path:
					join(
						path,
						entry.name
					),

				type:
					this.getEntryType(
						entry
					)
			})
		);
	}


	async readFile(
		path:
			string
	): Promise<
		Uint8Array
	> {

		return readFileBytes(
			path
		);
	}


	private getEntryType(
		entry:
			{
				isFile():
					boolean;

				isDirectory():
					boolean;
			}
	): SourceDirectoryEntryType {

		if (
			entry.isFile()
		) {
			return 'file';
		}


		if (
			entry.isDirectory()
		) {
			return 'directory';
		}


		return 'other';
	}


	private isFileNotFound(
		error:
			unknown
	): boolean {

		return (
			error instanceof Error &&
			'code' in error &&
			error.code ===
				'ENOENT'
		);
	}
}
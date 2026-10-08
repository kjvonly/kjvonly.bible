import {
	randomUUID
} from 'node:crypto';

import {
	mkdir,
	readFile,
	readdir,
	rename,
	unlink,
	writeFile
} from 'node:fs/promises';

import {
	join
} from 'node:path';

import {
	verifyEvent
} from 'nostr-tools/pure';

import {
	parseSignedNostrEvent
} from '#domain/event/parse-signed-nostr-event.js';

import {
	buildStagedFilesystemEventFilename,
	parseStagedFilesystemEventFilename
} from '#domain/staging/staged-filesystem-event-filename.js';

import {
	assertStagingLogicalName,
	STAGED_FILESYSTEMS_DIRECTORY
} from '#domain/staging/staging-layout.js';

import {
	FilesystemEventStagingRepository,
	StageFilesystemEventRequest,
	StagedFilesystemEventEntry
} from '#ports/staging/filesystem-event-staging-repository.js';


/** Node filesystem implementation for generated Filesystem Resource staging. */
export class NodeFilesystemEventStagingRepository
	implements FilesystemEventStagingRepository {

	async list(
		stagingRoot:
			string
	): Promise<readonly StagedFilesystemEventEntry[]> {
		const directory =
			this.getDirectory(
				stagingRoot
			);


		let entries;


		try {
			entries =
				await readdir(
					directory,
					{
						withFileTypes:
							true
					}
				);
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
				return [];
			}


			throw error;
		}


		const staged =
			entries
				.filter(
					entry =>
						entry.isFile() &&
						!entry.name.startsWith('.')
				)
				.map(
					entry => {
						const metadata =
							parseStagedFilesystemEventFilename(
								entry.name
							);


						return {
							path:
								join(
									directory,
									entry.name
								),

							...metadata
						};
					}
				);


		const names =
			new Set<string>();


		for (
			const entry
			of staged
		) {
			if (
				names.has(
					entry.filesystemName
				)
			) {
				throw new Error(
					`Multiple staged Filesystem events found for: ${entry.filesystemName}`
				);
			}


			names.add(
				entry.filesystemName
			);
		}


		return staged.sort(
			(
				left,
				right
			) =>
				left.filesystemName.localeCompare(
					right.filesystemName
				)
		);
	}


	async read(
		entry:
			StagedFilesystemEventEntry
	): Promise<ReturnType<typeof parseSignedNostrEvent>> {
		let parsed:
			unknown;


		try {
			parsed =
				JSON.parse(
					await readFile(
						entry.path,
						'utf8'
					)
				);
		}
		catch {
			throw new Error(
				`Invalid staged Filesystem event JSON: ${entry.path}`
			);
		}


		const event =
			parseSignedNostrEvent(
				parsed
			);


		if (
			event.id !==
				entry.eventId
		) {
			throw new Error(
				`Staged Filesystem event ID does not match filename: ${entry.path}`
			);
		}


		if (
			event.created_at !==
				entry.createdAt
		) {
			throw new Error(
				`Staged Filesystem event created_at does not match filename: ${entry.path}`
			);
		}


		if (
			!verifyEvent(
				event
			)
		) {
			throw new Error(
				`Invalid staged Filesystem event signature: ${entry.path}`
			);
		}


		return event;
	}


	async stage(
		request:
			StageFilesystemEventRequest
	): Promise<StagedFilesystemEventEntry> {
		assertStagingLogicalName(
			request.filesystemName
		);


		const directory =
			this.getDirectory(
				request.stagingRoot
			);


		await mkdir(
			directory,
			{
				recursive:
					true
			}
		);


		const filename =
			buildStagedFilesystemEventFilename({
				filesystemName:
					request.filesystemName,

				inputRevision:
					request.inputRevision,

				createdAt:
					request.event.created_at,

				eventId:
					request.event.id
			});


		const path =
			join(
				directory,
				filename
			);


		const temporaryPath =
			join(
				directory,
				`.${filename}.${randomUUID()}.tmp`
			);


		await writeFile(
			temporaryPath,
			`${JSON.stringify(
				request.event,
				null,
				'\t'
			)}\n`,
			'utf8'
		);


		await rename(
			temporaryPath,
			path
		);


		if (
			request.previous !== undefined &&
			request.previous.path !== path
		) {
			await unlink(
				request.previous.path
			);
		}


		return {
			path,
			filesystemName:
				request.filesystemName,
			inputRevision:
				request.inputRevision,
			createdAt:
				request.event.created_at,
			eventId:
				request.event.id
		};
	}


	async remove(
		entry:
			StagedFilesystemEventEntry
	): Promise<void> {
		try {
			await unlink(
				entry.path
			);
		}
		catch (
			error:
				unknown
		) {
			if (
				!this.isFileNotFound(
					error
				)
			) {
				throw error;
			}
		}
	}


	private getDirectory(
		stagingRoot:
			string
	): string {
		return join(
			stagingRoot,
			'events',
			STAGED_FILESYSTEMS_DIRECTORY
		);
	}


	private isFileNotFound(
		error:
			unknown
	): boolean {
		return (
			typeof error === 'object' &&
			error !== null &&
			'code' in error &&
			(
				error as {
					readonly code?:
						string;
				}
			).code === 'ENOENT'
		);
	}
}

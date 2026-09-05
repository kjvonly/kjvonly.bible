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
} from '../../domain/parse-signed-nostr-event.js';

import {
	buildStagedCollectionEventFilename,
	parseStagedCollectionEventFilename
} from '../../domain/staged-collection-event-filename.js';

import type {
	CollectionEventStagingRepository,
	StageCollectionEventRequest,
	StagedCollectionEventEntry
} from '../../ports/collection-event-staging-repository.js';


export class NodeCollectionEventStagingRepository
	implements CollectionEventStagingRepository {

	async list(
		stagingRoot:
			string
	): Promise<
		readonly StagedCollectionEventEntry[]
	> {

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
						!entry.name
							.startsWith(
								'.'
							)
				)
				.map(
					entry => {

						const metadata =
							parseStagedCollectionEventFilename(
								entry.name
							);


						return {
							path:
								join(
									directory,
									entry.name
								),

							collectionName:
								metadata
									.collectionName,

							eventId:
								metadata
									.eventId
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
					entry.collectionName
				)
			) {
				throw new Error(
					`Multiple staged collection events found for: ${entry.collectionName}`
				);
			}


			names.add(
				entry.collectionName
			);
		}


		return staged;
	}


	async read(
		entry:
			StagedCollectionEventEntry
	) {

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
				`Invalid staged collection event JSON: ${entry.path}`
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
				`Staged collection event ID does not match filename: ${entry.path}`
			);
		}


		if (
			!verifyEvent(
				event
			)
		) {
			throw new Error(
				`Invalid staged collection event signature: ${entry.path}`
			);
		}


		return event;
	}


	async stage(
		request:
			StageCollectionEventRequest
	): Promise<
		StagedCollectionEventEntry
	> {

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
			buildStagedCollectionEventFilename({
				collectionName:
					request.collectionName,

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
			request.previous !==
				undefined &&
			request.previous.path !==
				path
		) {
			await unlink(
				request.previous.path
			);
		}


		return {
			path,

			collectionName:
				request.collectionName,

			eventId:
				request.event.id
		};
	}


	async remove(
		entry:
			StagedCollectionEventEntry
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
			'__collections__'
		);
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
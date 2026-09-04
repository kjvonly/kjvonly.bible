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
	buildStagedEventFilename,
	parseStagedEventFilename
} from '../../domain/staged-event-filename.js';

import type {
	SignedEventStagingRepository,
	StageSignedEventRequest,
	StagedEventEntry
} from '../../ports/signed-event-staging-repository.js';


export class NodeSignedEventStagingRepository
	implements SignedEventStagingRepository {

	async list(
		stagingRoot:
			string,

		resourceName:
			string
	): Promise<
		readonly StagedEventEntry[]
	> {

		const directory =
			this.getDirectory(
				stagingRoot,
				resourceName
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
					entry => ({
						path:
							join(
								directory,
								entry.name
							),

						metadata:
							parseStagedEventFilename(
								entry.name
							)
					})
				);


		const keys =
			new Set<string>();


		for (
			const entry
			of staged
		) {
			if (
				keys.has(
					entry.metadata.key
				)
			) {
				throw new Error(
					`Multiple staged events found for key: ${entry.metadata.key}`
				);
			}


			keys.add(
				entry.metadata.key
			);
		}


		return staged.sort(
			(
				left,
				right
			) =>
				left.metadata.key <
					right.metadata.key
					? -1
					: left.metadata.key >
						right.metadata.key
						? 1
						: 0
		);
	}


	async read(
		entry:
			StagedEventEntry
	): Promise<
		import(
			'../../domain/nostr-event.js'
		).SignedNostrEvent
	> {

		const source =
			await readFile(
				entry.path,
				'utf8'
			);


		let parsed:
			unknown;


		try {
			parsed =
				JSON.parse(
					source
				);
		}
		catch {
			throw new Error(
				`Invalid staged event JSON: ${entry.path}`
			);
		}


		const event =
			parseSignedNostrEvent(
				parsed
			);


		if (
			event.id !==
				entry.metadata.eventId
		) {
			throw new Error(
				`Staged event ID does not match filename: ${entry.path}`
			);
		}


		if (
			!verifyEvent(
				event
			)
		) {
			throw new Error(
				`Invalid staged event signature: ${entry.path}`
			);
		}


		return event;
	}


	async stage(
		request:
			StageSignedEventRequest
	): Promise<
		StagedEventEntry
	> {

		const directory =
			this.getDirectory(
				request.stagingRoot,
				request.resourceName
			);


		await mkdir(
			directory,
			{
				recursive:
					true
			}
		);


		const metadata = {
			key:
				request.key,

			sourceMtimeMs:
				request.sourceMtimeMs,

			sourceSize:
				request.sourceSize,

			definitionRevision:
				request.definitionRevision,

			eventId:
				request.event.id
		};


		const filename =
			buildStagedEventFilename(
				metadata
			);


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
			metadata
		};
	}


	async remove(
		entry:
			StagedEventEntry
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
			string,

		resourceName:
			string
	): string {

		return join(
			stagingRoot,
			'events',
			resourceName
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
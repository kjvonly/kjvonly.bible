import {
	mkdir,
	rename,
	writeFile
} from 'node:fs/promises';

import {
	join
} from 'node:path';

import {
	randomUUID
} from 'node:crypto';

import type {
	SignedEventStagingRepository,
	StageSignedEventRequest
} from '../../ports/signed-event-staging-repository.js';


export class NodeSignedEventStagingRepository
	implements SignedEventStagingRepository {

	async stage(
		request:
			StageSignedEventRequest
	): Promise<
		string
	> {

		const directory =
			join(
				request.stagingRoot,
				'events',
				request.resourceName
			);


		await mkdir(
			directory,
			{
				recursive:
					true
			}
		);


		const filename =
			`${request.key}--${request.event.id}.json`;


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


		const serialized =
			`${JSON.stringify(
				request.event,
				null,
				'\t'
			)}\n`;


		await writeFile(
			temporaryPath,
			serialized,
			'utf8'
		);


		await rename(
			temporaryPath,
			path
		);


		return path;
	}
}
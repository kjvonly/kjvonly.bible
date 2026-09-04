import {
	mkdtemp,
	readFile,
	rm
} from 'node:fs/promises';

import {
	basename,
	join
} from 'node:path';

import {
	tmpdir
} from 'node:os';

import {
	afterEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	NodeSignedEventStagingRepository
} from './node-signed-event-staging-repository.js';


const directories:
	string[] = [];


async function createDirectory():
	Promise<string> {

	const directory =
		await mkdtemp(
			join(
				tmpdir(),
				'kjvonly-staging-'
			)
		);


	directories.push(
		directory
	);


	return directory;
}


afterEach(
	async () => {

		for (
			const directory
			of directories.splice(0)
		) {
			await rm(
				directory,
				{
					recursive:
						true,

					force:
						true
				}
			);
		}
	}
);


describe(
	'NodeSignedEventStagingRepository',
	() => {

		it(
			'stages a complete signed event with the event ID in the filename',
			async () => {

				const stagingRoot =
					await createDirectory();


				const repository =
					new NodeSignedEventStagingRepository();


				const event = {
					id:
						'abc123',

					pubkey:
						'publisher',

					created_at:
						1_000,

					kind:
						37770,

					tags: [
						[
							'd',
							'resource'
						]
					],

					content:
						'content',

					sig:
						'signature'
				};


				const path =
					await repository.stage({
						stagingRoot,

						resourceName:
							'chapters',

						key:
							'1_1',

						event
					});


				expect(
					basename(
						path
					)
				).toBe(
					'1_1--abc123.json'
				);


				const stored =
					JSON.parse(
						await readFile(
							path,
							'utf8'
						)
					);


				expect(
					stored
				).toEqual(
					event
				);
			}
		);
	}
);
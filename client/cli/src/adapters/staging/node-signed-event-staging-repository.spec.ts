import {
	mkdtemp,
	readdir,
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
	LocalNostrSigner
} from '../nostr/local-nostr-signer.js';

import {
	NodeSignedEventStagingRepository
} from './node-signed-event-staging-repository.js';


const directories:
	string[] = [];


const secretKey =
	'01'.repeat(
		32
	);


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


async function createEvent(
	createdAt:
		number
) {

	return new LocalNostrSigner(
		secretKey
	).sign({
		kind:
			37770,

		created_at:
			createdAt,

		tags: [
			[
				'd',
				'resource'
			]
		],

		content:
			'content'
	});
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
			'stages and reads a signed event',
			async () => {

				const stagingRoot =
					await createDirectory();


				const repository =
					new NodeSignedEventStagingRepository();


				const event =
					await createEvent(
						1_000
					);


				const entry =
					await repository.stage({
						stagingRoot,

						resourceName:
							'chapters',

						key:
							'1_1',

						sourceMtimeMs:
							1788461234123,

						sourceSize:
							18453,

						definitionRevision:
							'71a3cbd1',

						event
					});


				expect(
					basename(
						entry.path
					)
				).toBe(
					`1_1--1788461234123--18453--71a3cbd1--${event.id}.json`
				);


				expect(
					await repository.read(
						entry
					)
				).toEqual(
					event
				);
			}
		);


		it(
			'replaces the previous current event',
			async () => {

				const stagingRoot =
					await createDirectory();


				const repository =
					new NodeSignedEventStagingRepository();


				const first =
					await repository.stage({
						stagingRoot,

						resourceName:
							'chapters',

						key:
							'1_1',

						sourceMtimeMs:
							100,

						sourceSize:
							10,

						definitionRevision:
							'11111111',

						event:
							await createEvent(
								1_000
							)
					});


				await repository.stage({
					stagingRoot,

					resourceName:
						'chapters',

					key:
						'1_1',

					sourceMtimeMs:
						200,

					sourceSize:
						20,

					definitionRevision:
						'22222222',

					event:
						await createEvent(
							1_001
						),

					previous:
						first
				});


				const files =
					await readdir(
						join(
							stagingRoot,
							'events',
							'chapters'
						)
					);


				expect(
					files
				).toHaveLength(1);
			}
		);
	}
);
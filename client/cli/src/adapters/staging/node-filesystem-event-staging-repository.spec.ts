import {
	mkdtemp,
	rm
} from 'node:fs/promises';

import {
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
} from '#adapters/nostr/signer/local-nostr-signer.js';

import {
	NodeFilesystemEventStagingRepository
} from './node-filesystem-event-staging-repository.js';


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
				'kjvonly-filesystem-staging-'
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
	'NodeFilesystemEventStagingRepository',
	() => {
		it(
			'stages, lists, and verifies one generated Filesystem event per name',
			async () => {
				const stagingRoot =
					await createDirectory();


				const signer =
					new LocalNostrSigner(
						secretKey
					);


				const event =
					await signer.sign({
						kind:
							37770,
						created_at:
							100,
						tags: [
							['d', 'filesystem-resource']
						],
						content:
							'{}'
					});


				const repository =
					new NodeFilesystemEventStagingRepository();


				const staged =
					await repository.stage({
						stagingRoot,
						filesystemName:
							'library',
						inputRevision:
							'a'.repeat(32),
						event
					});


				expect(
					await repository.list(
						stagingRoot
					)
				).toEqual([
					staged
				]);


				expect(
					await repository.read(
						staged
					)
				).toEqual(
					event
				);
			}
		);


		it(
			'atomically stages a maximum-length Filesystem name',
			async () => {
				const stagingRoot = await createDirectory();
				const event = await new LocalNostrSigner(secretKey).sign({
					kind: 37770,
					created_at: 1_791_837_567,
					tags: [],
					content: '{}'
				});
				const repository = new NodeFilesystemEventStagingRepository();

				const staged = await repository.stage({
					stagingRoot,
					filesystemName: 'a'.repeat(128),
					inputRevision: 'b'.repeat(32),
					event
				});

				expect(await repository.list(stagingRoot)).toEqual([staged]);
				expect(await repository.read(staged)).toEqual(event);
			}
		);

		it(
			'replaces the previous staged revision for the same Filesystem definition',
			async () => {
				const stagingRoot =
					await createDirectory();


				const signer =
					new LocalNostrSigner(
						secretKey
					);


				const repository =
					new NodeFilesystemEventStagingRepository();


				const firstEvent =
					await signer.sign({
						kind:
							37770,
						created_at:
							100,
						tags:
							[],
						content:
							'{}'
					});


				const first =
					await repository.stage({
						stagingRoot,
						filesystemName:
							'library',
						inputRevision:
							'a'.repeat(32),
						event:
							firstEvent
					});


				const secondEvent =
					await signer.sign({
						kind:
							37770,
						created_at:
							101,
						tags:
							[],
						content:
							'{"changed":true}'
					});


				const second =
					await repository.stage({
						stagingRoot,
						filesystemName:
							'library',
						inputRevision:
							'b'.repeat(32),
						event:
							secondEvent,
						previous:
							first
					});


				expect(
					await repository.list(
						stagingRoot
					)
				).toEqual([
					second
				]);
			}
		);
	}
);

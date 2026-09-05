import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	Manifest
} from '../domain/manifest.js';

import type {
	ArtifactStagingRepository,
	StagedArtifactEntry
} from '../ports/artifact-staging-repository.js';

import {
	BlossomArtifactPublisher
} from './blossom-artifact-publisher.js';


function createManifest() {

	return {
		version:
			1,

		kind:
			37770,

		staging: {
			path:
				'./.kjvonly'
		},

		nostr: {
			relays: [
				'wss://relay.example'
			]
		},

		strategies: {
			primary: {
				type:
					'blossom',

				urls: [
					'https://blossom-a.example',
					'https://blossom-b.example'
				]
			}
		},

		defaults: {
			strategy:
				'primary'
		},

		resources: {
			bundle: {
				path:
					'./data',

				event: {
					encoding: [
						'hex'
					],

					tags: [
						[
							'd',
							'test/${key}'
						]
					]
				},

				'object-upload': {
					mediaType:
						'application/json+gzip',

					encoding:
						[]
				}
			}
		},

		collections:
			{}
	} satisfies Manifest;
}


function createArtifact(
	kind:
		'symlink' |
		'file' =
			'file'
): StagedArtifactEntry {

	return {
		path:
			'/staging/artifact',

		kind,

		size:
			100,

		metadata: {
			key:
				'bundle',

			sourceMtimeMs:
				1000,

			sourceSize:
				100,

			artifactRevision:
				'12345678',

			sha256:
				'a'.repeat(
					64
				),

			extension:
				'.json.gz'
		}
	};
}


describe(
	'BlossomArtifactPublisher',
	() => {

	it(
		'ensures every configured Blossom mirror',
		async () => {

			const artifact =
				createArtifact();


			const stagingRepository = {
				list:
					vi.fn(
						async () => [
							artifact
						]
					)
			} as unknown as ArtifactStagingRepository;


			const ensure =
				vi.fn()
					.mockResolvedValueOnce(
						'already-present'
					)
					.mockResolvedValueOnce(
						'uploaded'
					);


			const publisher =
				new BlossomArtifactPublisher(
					stagingRepository,

					{
						getFileMetadata:
							async () => ({
								mtimeMs:
									1000,

								size:
									100
							})
					} as never,

					{
						ensure
					}
				);


			const results =
				await publisher.publish(
					createManifest(),
					'/staging'
				);


			expect(
				ensure
			).toHaveBeenCalledTimes(
				2
			);


			expect(
				results.map(
					result =>
						result.status
				)
			).toEqual([
				'already-present',
				'uploaded'
			]);
		}
	);


	it(
		'fails before publication when a symlink artifact is stale',
		async () => {

			const artifact =
				createArtifact(
					'symlink'
				);


			const ensure =
				vi.fn();


			const publisher =
				new BlossomArtifactPublisher(
					{
						list:
							async () => [
								artifact
							]
					} as unknown as ArtifactStagingRepository,

					{
						getFileMetadata:
							async () => ({
								mtimeMs:
									2000,

								size:
									100
							})
					} as never,

					{
						ensure
					}
				);


			await expect(
				publisher.publish(
					createManifest(),
					'/staging'
				)
			).rejects.toThrow(
				'Staged artifact is stale'
			);


			expect(
				ensure
			).not.toHaveBeenCalled();
		}
	);
});
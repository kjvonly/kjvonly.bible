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
	GzipEncoder
} from '../adapters/encoding/gzip-encoder.js';

import {
	HexEncoder
} from '../adapters/encoding/hex-encoder.js';

import {
	LocalNostrSigner
} from '../adapters/nostr/local-nostr-signer.js';

import {
	NodeCollectionEventStagingRepository
} from '../adapters/staging/node-collection-event-staging-repository.js';

import type {
	Manifest
} from '../domain/manifest.js';

import type {
	ResourceDescriptor
} from '../domain/resource-descriptor.js';

import {
	CollectionBuilder
} from './collection-builder.js';

import {
	CollectionEventBuilder
} from './collection-event-builder.js';

import {
	EncodingRegistry
} from './encoding/encoding-registry.js';


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
				'kjvonly-collection-'
			)
		);


	directories.push(
		directory
	);


	return directory;
}


function createDescriptor(
	resourceId:
		string,

	modifiedAt:
		number
): ResourceDescriptor {

	return {
		metadata: {
			publisher:
				'a'.repeat(
					64
				),

			resourceId,

			category:
				'kjvonly/test',

			modifiedAt,

			mediaType:
				'application/json+gzip'
		},

		strategy: {
			type:
				'blossom',

			data: {
				urls: [
					'https://blossom.example'
				],

				sha256:
					'b'.repeat(
						64
					),

				size:
					100
			}
		}
	};
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
	'CollectionBuilder',
	() => {

		it(
			'aggregates Resource descriptors in deterministic collection order',
			async () => {

				const stagingRoot =
					await createDirectory();


				const manifest =
					{
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

						strategies:
							{},

						resources:
							{},

						collections: {
							defaults: {
								event: {
									encoding: [
										'hex'
									],

									tags: [
										[
											'd',
											'kjvonly/resources/collections/default'
										],
										[
											'm',
											'application/json+hex'
										],
										[
											't',
											'kjvonly/resources/collections'
										],
										[
											'representation',
											'descriptors'
										]
									]
								},

								resources: [
									'chapters',
									'strongs'
								]
							}
						}
					} satisfies Manifest;


				const chapter1 =
					createDescriptor(
						'kjvonly/test/1_1',
						100
					);


				const chapter2 =
					createDescriptor(
						'kjvonly/test/1_2',
						101
					);


				const strongs =
					createDescriptor(
						'kjvonly/test/H1',
						102
					);


				const stagingRepository =
					new NodeCollectionEventStagingRepository();


				const builder =
					new CollectionBuilder(
						new CollectionEventBuilder(
							new EncodingRegistry([
								new GzipEncoder(),
								new HexEncoder()
							]),

							new LocalNostrSigner(
								secretKey
							),

							{
								nowEpochSeconds:
									() =>
										1000
							}
						),

						stagingRepository
					);


				await builder.build({
					manifest,

					stagingRoot,

					descriptorsByResource:
						new Map([
							[
								'chapters',
								[
									chapter1,
									chapter2
								]
							],
							[
								'strongs',
								[
									strongs
								]
							]
						])
				});


				const staged =
					await stagingRepository
						.list(
							stagingRoot
						);


				expect(
					staged
				).toHaveLength(1);


				const event =
					await stagingRepository
						.read(
							staged[0]!
						);


				const descriptors =
					JSON.parse(
						Buffer
							.from(
								event.content,
								'hex'
							)
							.toString(
								'utf8'
							)
					);


				expect(
					descriptors.map(
						(
							descriptor:
								ResourceDescriptor
						) =>
							descriptor
								.metadata
								.resourceId
					)
				).toEqual([
					'kjvonly/test/1_1',
					'kjvonly/test/1_2',
					'kjvonly/test/H1'
				]);


				expect(
					event.tags
				).toEqual(
					manifest
						.collections
						.defaults
						.event
						.tags
				);
			}
		);


		it(
			'fails when a collection member does not produce descriptors',
			async () => {

				const stagingRoot =
					await createDirectory();


				const manifest =
					{
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

						strategies:
							{},

						resources:
							{},

						collections: {
							defaults: {
								event: {
									encoding: [
										'hex'
									],

									tags: [
										[
											'd',
											'collection'
										]
									]
								},

								resources: [
									'inline-resource'
								]
							}
						}
					} as Manifest;


				const builder =
					new CollectionBuilder(
						new CollectionEventBuilder(
							new EncodingRegistry([
								new GzipEncoder(),
								new HexEncoder()
							]),

							new LocalNostrSigner(
								secretKey
							),

							{
								nowEpochSeconds:
									() =>
										1000
							}
						),

						new NodeCollectionEventStagingRepository()
					);


				await expect(
					builder.build({
						manifest,

						stagingRoot,

						descriptorsByResource:
							new Map()
					})
				).rejects.toThrow(
					'Collection "defaults" Resource "inline-resource" did not produce descriptors.'
				);
			}
		);
	}
);
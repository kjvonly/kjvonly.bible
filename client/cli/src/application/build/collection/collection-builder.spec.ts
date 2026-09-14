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
	it,
	vi
} from 'vitest';

import {
	GzipEncoder
} from '#adapters/encoding/gzip-encoder.js';

import {
	HexEncoder
} from '#adapters/encoding/hex-encoder.js';


import {
	NodeCollectionEventStagingRepository
} from '#adapters/staging/node-collection-event-staging-repository.js';



import {
	CollectionBuilder
} from './collection-builder.js';

import {
	CollectionEventBuilder
} from './collection-event-builder.js';

import {
	EncodingRegistry
} from '../encoding/encoding-registry.js';
import { LocalNostrSigner } from '#adapters/nostr/signer/local-nostr-signer.js';
import { Manifest } from '#domain/manifest/manifest.js';
import { ResourceDescriptor } from '#domain/resource/resource-descriptor.js';
import { Logger } from '#ports/logging/logger.js';


const directories:
	string[] = [];


const secretKey =
	'01'.repeat(
		32
	);


function createLogger():
	Logger {

	return {
		verbose:
			vi.fn()
	};
}


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

			representation:
				'content',

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
								],

								collections: []
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


				const logger =
					createLogger();


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

						stagingRepository,
						logger
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



				expect(
					logger.verbose
				).toHaveBeenCalledWith(
					'collection.build.start',
					{
						collectionCount:
							1,

						stagedCount:
							0
					}
				);


				expect(
					logger.verbose
				).toHaveBeenCalledWith(
					'collection.member.resolved',
					{
						collectionName:
							'defaults',

						resourceName:
							'chapters',

						descriptorCount:
							2
					}
				);


				expect(
					logger.verbose
				).toHaveBeenCalledWith(
					'collection.event.staged',
					{
						collectionName:
							'defaults',

						eventId:
							event.id
					}
				);


				expect(
					logger.verbose
				).toHaveBeenCalledWith(
					'collection.build.complete',
					{
						collectionCount:
							1
					}
				);
			}
		);


		it(
			'builds referenced child collections before parents and emits a Nostr descriptor',
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
							parent: {
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

								resources: [],

								collections: [
									'child'
								]
							},

							child: {
								event: {
									encoding: [
										'hex'
									],

									tags: [
										[
											'd',
											'kjvonly/plans/readings/default'
										],
										[
											'm',
											'application/json+hex'
										],
										[
											't',
											'kjvonly/plans/readings'
										],
										[
											'representation',
											'descriptors'
										]
									]
								},

								resources: [
									'plans'
								],

								collections: []
							}
						}
					} satisfies Manifest;


				const plan =
					createDescriptor(
						'kjvonly/plans/readings/default/mcheyne',
						100
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

						stagingRepository,
						createLogger()
					);


				await builder.build({
					manifest,

					stagingRoot,

					descriptorsByResource:
						new Map([
							[
								'plans',
								[
									plan
								]
							]
						])
				});


				const staged =
					await stagingRepository
						.list(
							stagingRoot
						);


				const parentEntry =
					staged.find(
						entry =>
							entry.collectionName ===
								'parent'
					);


				expect(
					parentEntry
				).toBeDefined();


				const parentEvent =
					await stagingRepository
						.read(
							parentEntry!
						);


				const descriptors:
					ResourceDescriptor[] =
						JSON.parse(
							Buffer
								.from(
									parentEvent.content,
									'hex'
								)
								.toString(
									'utf8'
								)
						);


				expect(
					descriptors
				).toHaveLength(1);


				expect(
					descriptors[0]
				).toMatchObject({
					metadata: {
						resourceId:
							'kjvonly/plans/readings/default',

						category:
							'kjvonly/plans/readings',

						representation:
							'descriptors',

						mediaType:
							'application/json+hex'
					},

					strategy: {
						type:
							'nostr',

						data: {
							kind:
								37770,

							relays: [
								'wss://relay.example'
							]
						}
					}
				});
			}
		);


		it(
			'rejects collection dependency cycles',
			async () => {

				const stagingRoot =
					await createDirectory();


				const createCollection =
					(
						resourceId:
							string,

						collections:
							string[]
					) => ({
						event: {
							encoding: [
								'hex' as const
							],

							tags: [
								[
									'd',
									resourceId
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

						resources: [],

						collections
					});


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
							a:
								createCollection(
									'kjvonly/test/a',
									[
										'b'
									]
								),

							b:
								createCollection(
									'kjvonly/test/b',
									[
										'a'
									]
								)
						}
					} satisfies Manifest;


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

						new NodeCollectionEventStagingRepository(),
						createLogger()
					);


				await expect(
					builder.build({
						manifest,

						stagingRoot,

						descriptorsByResource:
							new Map()
					})
				).rejects.toThrow(
					'Collection dependency cycle: a -> b -> a'
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
								],

								collections: []
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

						new NodeCollectionEventStagingRepository(),
						createLogger()
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
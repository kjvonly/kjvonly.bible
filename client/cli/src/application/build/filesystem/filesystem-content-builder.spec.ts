import {
	describe,
	expect,
	it
} from 'vitest';

import {
	SignedNostrEvent
} from '#domain/event/nostr-event.js';

import {
	FilesystemDirectoryDefinition,
	Manifest
} from '#domain/manifest/manifest.js';

import {
	CollectionEventStagingRepository,
	StagedCollectionEventEntry
} from '#ports/staging/collection-event-staging-repository.js';

import {
	SignedEventStagingRepository,
	StagedEventEntry
} from '#ports/staging/signed-event-staging-repository.js';

import {
	NostrEventResourceDescriptorBuilder
} from '../descriptor/nostr-event-resource-descriptor-builder.js';

import {
	FilesystemContentBuilder
} from './filesystem-content-builder.js';


interface ResourceFixture {
	readonly key:
		string;

	readonly event:
		SignedNostrEvent;
}


interface CollectionFixture {
	readonly collectionName:
		string;

	readonly event:
		SignedNostrEvent;
}


function createEvent(
	resourceId:
		string,

	createdAt:
		number,

	representation:
		'content' | 'descriptors' = 'content'
): SignedNostrEvent {
	return {
		id:
			createdAt
				.toString(16)
				.padStart(
					64,
					'0'
				),

		pubkey:
			'b'.repeat(
				64
			),

		created_at:
			createdAt,

		kind:
			37770,

		tags: [
			['d', resourceId],
			['m', 'application/json+hex'],
			['t', 'test/resource'],
			['dataType', 'kjvonly.test'],
			['dataVersion', '1'],
			['representation', representation]
		],

		content:
			'content',

		sig:
			'c'.repeat(
				128
			)
	};
}


function createDirectory(
	input: {
		readonly path?:
			string;

		readonly resources?:
			FilesystemDirectoryDefinition['resources'];

		readonly collections?:
			FilesystemDirectoryDefinition['collections'];
	}
): FilesystemDirectoryDefinition {
	return {
		path:
			input.path ?? '',

		resources:
			input.resources ?? {},

		collections:
			input.collections ?? {}
	};
}


function createManifest(
	directories:
		readonly FilesystemDirectoryDefinition[]
): Manifest {
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

		strategies:
			{},

		resources:
			{},

		collections:
			{},

		filesystems: {
			library: {
				root:
					'library',

				event: {
					encoding:
						[],

					tags:
						[]
				},

				directories
			}
		}
	};
}


function createResourceStagingRepository(
	fixtures:
		Readonly<Record<string, readonly ResourceFixture[]>>
): SignedEventStagingRepository {
	const eventsByPath =
		new Map<
			string,
			SignedNostrEvent
		>();


	return {
		list:
			async (
				_stagingRoot,
				resourceName
			) => (
				fixtures[
					resourceName
				] ?? []
			).map(
				(
					fixture,
					index
				): StagedEventEntry => {
					const path =
						`resource:${resourceName}:${fixture.key}:${index}`;


					eventsByPath.set(
						path,
						fixture.event
					);


					return {
						path,

						metadata: {
							key:
								fixture.key,

							sourceMtimeMs:
								1,

							sourceSize:
								1,

							definitionRevision:
								'12345678',

							createdAt:
								fixture.event.created_at,

							eventId:
								fixture.event.id
						}
					};
				}
			),

		read:
			async entry => {
				const event =
					eventsByPath.get(
						entry.path
					);


				if (
					event === undefined
				) {
					throw new Error(
						`Unknown staged Resource event: ${entry.path}`
					);
				}


				return event;
			},

		stage:
			async () => {
				throw new Error(
					'Unexpected Resource stage.'
				);
			},

		remove:
			async () => {}
	};
}


function createCollectionStagingRepository(
	fixtures:
		readonly CollectionFixture[]
): CollectionEventStagingRepository {
	const entries =
		fixtures.map(
			(
				fixture,
				index
			): StagedCollectionEventEntry => ({
				path:
					`collection:${fixture.collectionName}:${index}`,

				collectionName:
					fixture.collectionName,

				createdAt:
					fixture.event.created_at,

				eventId:
					fixture.event.id
			})
		);


	const eventsByPath =
		new Map(
			entries.map(
				(
					entry,
					index
				) => [
					entry.path,
					fixtures[index]!.event
				]
			)
		);


	return {
		list:
			async () =>
				entries,

		read:
			async entry => {
				const event =
					eventsByPath.get(
						entry.path
					);


				if (
					event === undefined
				) {
					throw new Error(
						`Unknown staged Collection event: ${entry.path}`
					);
				}


				return event;
			},

		stage:
			async () => {
				throw new Error(
					'Unexpected Collection stage.'
				);
			},

		remove:
			async () => {}
	};
}


function createBuilder(
	resourceFixtures:
		Readonly<Record<string, readonly ResourceFixture[]>>,

	collectionFixtures:
		readonly CollectionFixture[] = []
): FilesystemContentBuilder {
	return new FilesystemContentBuilder(
		createResourceStagingRepository(
			resourceFixtures
		),
		createCollectionStagingRepository(
			collectionFixtures
		),
		new NostrEventResourceDescriptorBuilder()
	);
}


async function buildResult(
	builder:
		FilesystemContentBuilder,

	manifest:
		Manifest
) {
	return builder.build({
		manifest,
		stagingRoot:
			'/staging',
		filesystemName:
			'library',
		filesystem:
			manifest.filesystems.library!
	});
}


async function buildContent(
	builder:
		FilesystemContentBuilder,

	manifest:
		Manifest
) {
	return (
		await buildResult(
			builder,
			manifest
		)
	).content;
}


describe(
	'FilesystemContentBuilder',
	() => {
		it(
			'expands bulk Resources, selective Resources, and Collections into full deterministic paths',
			async () => {
				const manifest =
					createManifest([
						createDirectory({
							path:
								'bible/chapters',

							resources: {
								'kjvs-chapters': {
									resource:
										'chapters'
								},

								'genesis-1': {
									resource:
										'chapters',

									key:
										'1_1'
								}
							}
						}),
						createDirectory({
							path:
								'bootstrap',

							collections: {
								defaults: {
									collection:
										'defaults'
								}
							}
						})
					]);


				const content =
					await buildContent(
						createBuilder(
							{
								chapters: [
									{
										key:
											'1_2',

										event:
											createEvent(
												'kjvonly/test/1_2',
												102
											)
									},
									{
										key:
											'1_1',

										event:
											createEvent(
												'kjvonly/test/1_1',
												101
											)
									}
								]
							},
							[
								{
									collectionName:
										'defaults',

									event:
										createEvent(
											'kjvonly/collections/defaults',
											201,
											'descriptors'
										)
								}
							]
						),
						manifest
					);


				expect(
					Object.keys(
						content
					)
				).toEqual([
					'library/bible/chapters/genesis-1',
					'library/bible/chapters/kjvs-chapters/1_1',
					'library/bible/chapters/kjvs-chapters/1_2',
					'library/bootstrap/defaults'
				]);


				expect(
					content[
						'library/bible/chapters/genesis-1'
					]?.descriptor.metadata.resourceId
				).toBe(
					'kjvonly/test/1_1'
				);


				expect(
					content[
						'library/bootstrap/defaults'
					]?.descriptor.metadata.representation
				).toBe(
					'descriptors'
				);


				expect(
					content[
						'library/bible/chapters/genesis-1'
					]?.descriptor.strategy
				).toEqual({
					type:
						'nostr',

					data: {
						kind:
							37770,

						relays: [
							'wss://relay.example'
						]
					}
				});
			}
		);


		it(
			'returns deterministic target event revisions for incremental Filesystem staging',
			async () => {
				const manifest =
					createManifest([
						createDirectory({
							resources: {
								chapters: {
									resource:
										'chapters'
								}
							}
						})
					]);


				const result =
					await buildResult(
						createBuilder({
							chapters: [
								{
									key:
										'1_2',

									event:
										createEvent(
											'kjvonly/test/1_2',
											102
										)
								},
								{
									key:
										'1_1',

									event:
										createEvent(
											'kjvonly/test/1_1',
											101
										)
								}
							]
						}),
						manifest
					);


				expect(
					result.references
				).toEqual([
					{
						path:
							'library/chapters/1_1',

						eventId:
							createEvent(
								'kjvonly/test/1_1',
								101
							).id
					},
					{
						path:
							'library/chapters/1_2',

						eventId:
							createEvent(
								'kjvonly/test/1_2',
								102
							).id
					}
				]);
			}
		);

		it(
			'keeps one-key bulk placement under the placement directory',
			async () => {
				const manifest =
					createManifest([
						createDirectory({
							resources: {
								chapters: {
									resource:
										'chapters'
								}
							}
						})
					]);


				const content =
					await buildContent(
						createBuilder({
							chapters: [
								{
									key:
										'1_1',

									event:
										createEvent(
											'kjvonly/test/1_1',
											101
										)
								}
							]
						}),
						manifest
					);


				expect(
					Object.keys(
						content
					)
				).toEqual([
					'library/chapters/1_1'
				]);
			}
		);


		it(
			'fails when a selective staged key does not exist',
			async () => {
				const manifest =
					createManifest([
						createDirectory({
							resources: {
								genesis: {
									resource:
										'chapters',

									key:
										'1_1'
								}
							}
						})
					]);


				await expect(
					buildContent(
						createBuilder({
							chapters: [
								{
									key:
										'1_2',

									event:
										createEvent(
											'kjvonly/test/1_2',
											102
										)
								}
							]
						}),
						manifest
					)
				).rejects.toThrow(
					'Filesystem "library" Resource "chapters" has no staged key "1_1".'
				);
			}
		);


		it(
			'fails when a bulk Resource has no staged events',
			async () => {
				const manifest =
					createManifest([
						createDirectory({
							resources: {
								chapters: {
									resource:
										'chapters'
								}
							}
						})
					]);


				await expect(
					buildContent(
						createBuilder({}),
						manifest
					)
				).rejects.toThrow(
					'Filesystem "library" Resource "chapters" produced no staged Resources.'
				);
			}
		);


		it(
			'rejects a staged bulk key that is not one Filesystem basename',
			async () => {
				const manifest =
					createManifest([
						createDirectory({
							resources: {
								chapters: {
									resource:
										'chapters'
								}
							}
						})
					]);


				await expect(
					buildContent(
						createBuilder({
							chapters: [
								{
									key:
										'bad/key',

									event:
										createEvent(
											'kjvonly/test/bad',
											101
										)
								}
							]
						}),
						manifest
					)
				).rejects.toThrow(
					'Filesystem "library" Resource "chapters" staged key is not a valid Filesystem basename: bad/key'
				);
			}
		);


		it(
			'fails when a referenced Collection is not staged',
			async () => {
				const manifest =
					createManifest([
						createDirectory({
							collections: {
								defaults: {
									collection:
										'defaults'
								}
							}
						})
					]);


				await expect(
					buildContent(
						createBuilder({}),
						manifest
					)
				).rejects.toThrow(
					'Filesystem "library" Collection "defaults" is not staged.'
				);
			}
		);


		it(
			'rejects exact path collisions',
			async () => {
				const manifest =
					createManifest([
						createDirectory({
							path:
								'books',

							resources: {
								foo: {
									resource:
										'chapters',

									key:
										'1_1'
								}
							}
						}),
						createDirectory({
							path:
								'books',

							resources: {
								foo: {
									resource:
										'bundle',

									key:
										'bundle'
								}
							}
						})
					]);


				await expect(
					buildContent(
						createBuilder({
							chapters: [
								{
									key:
										'1_1',

									event:
										createEvent(
											'kjvonly/test/1_1',
											101
										)
								}
							],

							bundle: [
								{
									key:
										'bundle',

									event:
										createEvent(
											'kjvonly/bundle/default',
											102
										)
								}
							]
						}),
						manifest
					)
				).rejects.toThrow(
					'Filesystem "library" contains duplicate path: library/books/foo'
				);
			}
		);


		it(
			'rejects file and directory prefix collisions',
			async () => {
				const manifest =
					createManifest([
						createDirectory({
							path:
								'books',

							resources: {
								foo: {
									resource:
										'chapters',

									key:
										'1_1'
								}
							}
						}),
						createDirectory({
							path:
								'books/foo',

							resources: {
								bar: {
									resource:
										'bundle',

									key:
										'bundle'
								}
							}
						})
					]);


				await expect(
					buildContent(
						createBuilder({
							chapters: [
								{
									key:
										'1_1',

									event:
										createEvent(
											'kjvonly/test/1_1',
											101
										)
								}
							],

							bundle: [
								{
									key:
										'bundle',

									event:
										createEvent(
											'kjvonly/bundle/default',
											102
										)
								}
							]
						}),
						manifest
					)
				).rejects.toThrow(
					'Filesystem "library" contains file/directory collision: library/books/foo and library/books/foo/bar'
				);
			}
		);
	}
);

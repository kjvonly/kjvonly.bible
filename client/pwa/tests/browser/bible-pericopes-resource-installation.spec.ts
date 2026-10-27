import {
	describe,
	expect,
	it
} from 'vitest';

import {
	type PublishedResourceReference,
	type ResourceRepresentation,
	type VerifiedResourceContent,
	createResourceInstallationId,
	createResourceReceiptId,
	type ResourceResolutionResult,
	GenericResourceInstaller,
	ResourceDataTypeResolver,
	ResourceDomainObjectFactoryResolver,
	ResourceContentDecoratorBuilder,
	JsonResourceContentDecorator,
	ResourceContentDecoder,
	ResourceService,
	ResourceProcessor,
	ResourceReceiptService
} from '$lib/resource';

import {
	ResourceResolutionProcessor
} from '$lib/resource/services/resource-resolution-processor';

import {
	BIBLE_PERICOPES_DATA_TYPE,
	BIBLE_PERICOPES_DATA_VERSION,
	BIBLE_PERICOPES_RESOURCE_TYPE,
	BiblePericopesDataTypeHandler,
	BiblePericopesDomainObjectFactory
} from '$lib/domains/bible';

import {
	BIBLE_PERICOPES_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-pericopes-store';

import {
	IndexedDBBiblePericopesStore
} from '$lib/domains/bible/persistence/indexeddb-bible-pericopes-store';

import {
	IndexedDBGenericResourceInstallationTransaction
} from '$lib/resource/installation/indexeddb-generic-resource-installation-transaction';

import {
	createBiblePericopesId
} from '$lib/domains/bible/models/bible-pericopes.model';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	IndexedDBResourceReceiptStore
} from '$lib/resource/receipts/indexeddb-resource-receipt-store';

describe(
	'Bible Pericopes Resource installation',
	() => {
		it(
			'decodes validates and installs a Pericope bundle into IndexedDB through the generic installer',
			async () => {
				const publisher =
					createPublisher();

				const resourceId =
					'kjvonly/bible/pericopes/default';

				const content = {
					'1_1': {
						'1_1_1': [
							createPericope(
								'1_1_1',
								'The Creation'
							)
						],

						'1_1_3': [
							createPericope(
								'1_1_3',
								'The First Day'
							)
						]
					},

					'1_2': {}
				};

				const service =
					createService([
						createVerifiedContent({
							publisher,
							resourceId,

							content:
								JSON.stringify(
									content
								)
						})
					]);

				const result =
					await service.install({
						publisher,
						resourceId
					});

				expect(
					result
				).toEqual({
					requested: {
						publisher,
						resourceId
					},

					found:
						true,

					resources: [
						{
							reference: {
								publisher,
								resourceId
							},

							resourceType:
								BIBLE_PERICOPES_RESOURCE_TYPE,

							status:
								'handled'
						}
					]
				});

				const pericopesStore =
					new IndexedDBBiblePericopesStore(
						getApplicationDB
					);

				const chapter1Id =
					createBiblePericopesId(
						publisher,
						'default',
						'1_1'
					);

				const chapter2Id =
					createBiblePericopesId(
						publisher,
						'default',
						'1_2'
					);

				expect(
					await pericopesStore.get(
						chapter1Id
					)
				).toEqual({
					id:
						chapter1Id,

					chapterRef:
						'1_1',

					pericopes:
						content['1_1']
				});

				expect(
					await pericopesStore.get(
						chapter2Id
					)
				).toEqual({
					id:
						chapter2Id,

					chapterRef:
						'1_2',

					pericopes:
						{}
				});

				const installationId =
					createResourceInstallationId(
						BIBLE_PERICOPES_OBJECT_TYPE,
						chapter1Id
					);

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							BIBLE_PERICOPES_OBJECT_TYPE,
							chapter1Id
						)
					)
				).toEqual({
					id:
						createStoredDomainObjectId(
							BIBLE_PERICOPES_OBJECT_TYPE,
							chapter1Id
						),
					objectType:
						BIBLE_PERICOPES_OBJECT_TYPE,
					objectId:
						chapter1Id,
					dataType:
						BIBLE_PERICOPES_DATA_TYPE,
					dataVersion:
						BIBLE_PERICOPES_DATA_VERSION,
					value: {
						id:
							chapter1Id,
						chapterRef:
							'1_1',
						pericopes:
							content['1_1']
					}
				});

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						installationId
					)
				).toEqual({
					id:
						installationId,

					objectType:
						BIBLE_PERICOPES_OBJECT_TYPE,

					objectId:
						chapter1Id,

					publisher,

					resourceId,

					modifiedAt:
						200
				});

				expect(
					await db.get(
						RESOURCE_RECEIPTS,
						createResourceReceiptId(
							publisher,
							resourceId
						)
					)
				).toEqual({
					id:
						createResourceReceiptId(
							publisher,
							resourceId
						),

					publisher,

					resourceId,

					modifiedAt:
						200
				});
			}
		);

		it(
			'installs nothing when one Pericope Chapter fails validation',
			async () => {
				const publisher =
					createPublisher();

				const resourceId =
					'kjvonly/bible/pericopes/default';

				const service =
					createService([
						createVerifiedContent({
							publisher,
							resourceId,

							content:
								JSON.stringify({
									'1_1': {
										'1_1_1': [
											createPericope(
												'1_1_1',
												'The Creation'
											)
										]
									},

									'1_2': {
										'1_3_1': [
											createPericope(
												'1_3_1',
												'Wrong Chapter'
											)
										]
									}
								})
						})
					]);

				const result =
					await service.install({
						publisher,
						resourceId
					});

				expect(
					result.found
				).toBe(
					true
				);

				expect(
					result.resources
				).toEqual([
					{
						reference: {
							publisher,
							resourceId
						},

						resourceType:
							BIBLE_PERICOPES_RESOURCE_TYPE,

						status:
							'failed',

						error:
							expect.any(
								Error
							)
					}
				]);

				const pericopesStore =
					new IndexedDBBiblePericopesStore(
						getApplicationDB
					);

				const chapter1Id =
					createBiblePericopesId(
						publisher,
						'default',
						'1_1'
					);

				const chapter2Id =
					createBiblePericopesId(
						publisher,
						'default',
						'1_2'
					);

				expect(
					await pericopesStore.get(
						chapter1Id
					)
				).toBeUndefined();

				expect(
					await pericopesStore.get(
						chapter2Id
					)
				).toBeUndefined();

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							BIBLE_PERICOPES_OBJECT_TYPE,
							chapter1Id
						)
					)
				).toBeUndefined();

				expect(
					await db.get(
						RESOURCE_RECEIPTS,
						createResourceReceiptId(
							publisher,
							resourceId
						)
					)
				).toBeUndefined();
			}
		);
	}
);

function createService(
	contents:
		readonly VerifiedResourceContent[]
): ResourceService {
	const discovery =
		new FakeDiscovery(
			createRepresentation()
		);

	const resolver =
		new FakeResolver(
			contents
		);

	const decoder =
		createDecoder();

	const receiptStore =
		new IndexedDBResourceReceiptStore(
			getApplicationDB
		);

	const receiptService =
		new ResourceReceiptService(
			receiptStore
		);

	const installer =
		new GenericResourceInstaller(
			new ResourceDataTypeResolver([
				new BiblePericopesDataTypeHandler()
			]),
			new ResourceDomainObjectFactoryResolver([
				new BiblePericopesDomainObjectFactory()
			]),
			new IndexedDBGenericResourceInstallationTransaction(
				getApplicationDB
			)
		);

	const resolutionProcessor =
		new ResourceResolutionProcessor(
			decoder,
			receiptService,
			installer,
			[]
		);

	const processor =
		new ResourceProcessor(
			resolver,
			resolutionProcessor
		);

	return new ResourceService(
		discovery,
		processor
	);
}

function createDecoder():
	ResourceContentDecoder {
	const builder =
		new ResourceContentDecoratorBuilder([
			{
				token:
					'application/json',

				decorate:
					(inner) =>
						new JsonResourceContentDecorator(
							inner
						)
			}
		]);

	return new ResourceContentDecoder(
		builder
	);
}

function createVerifiedContent(
	overrides:
		Partial<VerifiedResourceContent> =
		{}
): VerifiedResourceContent {
	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/bible/pericopes/default',

		resourceType:
			BIBLE_PERICOPES_RESOURCE_TYPE,

		dataType:
			BIBLE_PERICOPES_DATA_TYPE,

		dataVersion:
			BIBLE_PERICOPES_DATA_VERSION,

		modifiedAt:
			200,

		mediaType:
			'application/json',

		content:
			'{}',

		...overrides
	};
}

function createRepresentation():
	ResourceRepresentation {
	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/bible/pericopes/default',

		resourceType:
			BIBLE_PERICOPES_RESOURCE_TYPE,

		dataType:
			BIBLE_PERICOPES_DATA_TYPE,

		dataVersion:
			BIBLE_PERICOPES_DATA_VERSION,

		eventId:
			'c'.repeat(
				64
			),

		modifiedAt:
			200,

		representation:
			'content',

		mediaType:
			'application/json',

		payload:
			'{}'
	};
}

function createPericope(
	ref: string,
	text: string
) {
	return {
		text,
		ref,
		words: [
			{
				text,
				class:
					null,
				href:
					null,
				emphasis:
					false
			}
		]
	};
}

function createPublisher():
	string {
	const value =
		crypto
			.randomUUID()
			.replaceAll(
				'-',
				''
			);

	return (
		value +
		value
	);
}

class FakeDiscovery {
	constructor(
		private readonly representation:
			ResourceRepresentation
	) { }

	async get(
		_reference:
			PublishedResourceReference
	): Promise<
		ResourceRepresentation |
		null
	> {
		return this.representation;
	}
}

class FakeResolver {
	constructor(
		private readonly contents:
			readonly VerifiedResourceContent[]
	) {}

	async resolve(
		_resource:
			ResourceRepresentation
	): Promise<
		ResourceResolutionResult
	> {
		return {
			contents:
				this.contents,

			current:
				[],

			failures:
				[]
		};
	}
}

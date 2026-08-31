import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	ResourceResolutionStrategy
} from '$lib/resource/resolution/resource-resolution-strategy';

import {
	ResourceDescriptorDocumentDecoder
} from '$lib/resource/descriptors/resource-descriptor-document-decoder';

import {
	ResourceDescriptorValidator
} from '$lib/resource/descriptors/resource-descriptor-validator';

import {
	DescriptorsRepresentationResolver
} from '$lib/resource/resolution/descriptors-representation-resolver';

import {
	ContentRepresentationResolver
} from '$lib/resource/resolution/content-representation-resolver';

import {
	ResourceResolver
} from '$lib/resource/resolution/resource-resolver';

import {
	ResourceContentDecoratorBuilder
} from '$lib/resource/content/resource-content-decorator-builder';

import {
	JsonResourceContentDecorator
} from '$lib/resource/content/json-resource-content-decorator';

import {
	ResourceContentDecoder
} from '$lib/resource/content/resource-content-decoder';

import {
	ResourceReceiptService
} from '$lib/resource/receipts/resource-receipt.service';

import {
	IndexedDBResourceReceiptStore
} from '$lib/resource/receipts/indexeddb-resource-receipt-store';

import {
	createResourceReceiptId
} from '$lib/resource/receipts/resource-receipt';

import {
	ResourceService
} from '$lib/resource/services/resource.service';

///////////////////////////////////////////////////////////////////////////////
// Bible

import {
	IndexedDBBibleChapterInstallationTransaction
} from '$lib/domains/bible/persistence/bible-chapter-installation-transaction';

import {
	BibleChapterInstaller,
	BIBLE_CHAPTER_OBJECT_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-installer';

import {
	BibleChapterInterpreter
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
	BibleChapterValidator
} from '$lib/domains/bible/resources/chapters/bible-chapter-validator';

import {
	BibleChapterResourceHandler
} from '$lib/domains/bible/resources/chapters/bible-chapter-resource-handler';

import {
	createBibleVersionId,
	createChapterId
} from '$lib/domains/bible/utils/bible-identity';

///////////////////////////////////////////////////////////////////////////////
// Strong's

import {
	IndexedDBStrongsInstallationTransaction
} from '$lib/domains/strongs/persistence/strongs-installation-transaction';

import {
	StrongsInstaller
} from '$lib/domains/strongs/resources/definitions/strongs-installer';

import {
	StrongsInterpreter
} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

import {
	StrongsValidator
} from '$lib/domains/strongs/resources/definitions/strongs-validator';

import {
	StrongsResourceHandler
} from '$lib/domains/strongs/resources/definitions/strongs-resource-handler';

import {
	STRONGS_DEFINITION_OBJECT_TYPE
} from '$lib/domains/strongs/persistence/strongs-store';

import {
	createStrongsId
} from '$lib/domains/strongs/utils/strongs-identity';

///////////////////////////////////////////////////////////////////////////////

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	createResourceInstallationId
} from '$lib/resource/installation/resource-installation';

const COLLECTION_RESOURCE_ID =
	'kjvonly/resources/collections/default';

const CHAPTER_RESOURCE_ID =
	'kjvonly/bible/chapters/kjvs/1_1';

const STRONGS_RESOURCE_ID =
	'kjvonly/strongs/definitions/kjvs/G1';

describe(
	'Resource descriptor installation',
	() => {

		it(
			'resolves and installs different Resource Types from one descriptor collection',
			async () => {
				const collectionPublisher =
					createPublisher();

				const resourcePublisher =
					createPublisher();

				const chapterContent =
					createChapterContent(
						1
					);

				const strongsContent =
					createStrongsContent(
						'G1'
					);

				const descriptors = [
					createDescriptor({
						publisher:
							resourcePublisher,

						resourceId:
							CHAPTER_RESOURCE_ID,

						category:
							'kjvonly/bible/chapters',

						modifiedAt:
							100
					}),

					createDescriptor({
						publisher:
							resourcePublisher,

						resourceId:
							STRONGS_RESOURCE_ID,

						category:
							'kjvonly/strongs/definitions',

						modifiedAt:
							200
					})
				];

				const {
					service,
					strategy
				} = createService(
					createRepresentation(
						collectionPublisher,
						descriptors
					),
					new Map([
						[
							CHAPTER_RESOURCE_ID,
							encodeJson(
								chapterContent
							)
						],
						[
							STRONGS_RESOURCE_ID,
							encodeJson(
								strongsContent
							)
						]
					])
				);

				const result =
					await service.install({
						publisher:
							collectionPublisher,

						resourceId:
							COLLECTION_RESOURCE_ID
					});

				expect(
					result
				).toEqual({
					requested: {
						publisher:
							collectionPublisher,

						resourceId:
							COLLECTION_RESOURCE_ID
					},

					found:
						true,

					resources: [
						{
							reference: {
								publisher:
									resourcePublisher,

								resourceId:
									CHAPTER_RESOURCE_ID
							},

							resourceType:
								'kjvonly/bible/chapters',

							status:
								'handled'
						},

						{
							reference: {
								publisher:
									resourcePublisher,

								resourceId:
									STRONGS_RESOURCE_ID
							},

							resourceType:
								'kjvonly/strongs/definitions',

							status:
								'handled'
						}
					]
				});

				/*
				 * The strategy receives the child
				 * descriptor identity, not the identity
				 * of the containing collection.
				 */
				expect(
					strategy.descriptors.map(
						descriptor =>
							descriptor
								.metadata
								.publisher
					)
				).toEqual([
					resourcePublisher,
					resourcePublisher
				]);

				const bibleVersionId =
					createBibleVersionId(
						resourcePublisher,
						'kjvs'
					);

				const chapterId =
					createChapterId(
						bibleVersionId,
						'1_1'
					);

				const strongsId =
					createStrongsId(
						bibleVersionId,
						'G1'
					);

				expect(
					await getDomainObject(
						BIBLE_CHAPTER_OBJECT_TYPE,
						chapterId
					)
				).toEqual({
					id:
						chapterId,

					...chapterContent
				});

				expect(
					await getDomainObject(
						STRONGS_DEFINITION_OBJECT_TYPE,
						strongsId
					)
				).toEqual({
					id:
						strongsId,

					...strongsContent
				});

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							BIBLE_CHAPTER_OBJECT_TYPE,
							chapterId
						)
					)
				).toMatchObject({
					objectType:
						BIBLE_CHAPTER_OBJECT_TYPE,

					objectId:
						chapterId,

					publisher:
						resourcePublisher,

					resourceId:
						CHAPTER_RESOURCE_ID,

					modifiedAt:
						100
				});

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							STRONGS_DEFINITION_OBJECT_TYPE,
							strongsId
						)
					)
				).toMatchObject({
					objectType:
						STRONGS_DEFINITION_OBJECT_TYPE,

					objectId:
						strongsId,

					publisher:
						resourcePublisher,

					resourceId:
						STRONGS_RESOURCE_ID,

					modifiedAt:
						200
				});

				expect(
					await db.get(
						RESOURCE_RECEIPTS,
						createResourceReceiptId(
							resourcePublisher,
							CHAPTER_RESOURCE_ID
						)
					)
				).toEqual({
					id:
						createResourceReceiptId(
							resourcePublisher,
							CHAPTER_RESOURCE_ID
						),

					publisher:
						resourcePublisher,

					resourceId:
						CHAPTER_RESOURCE_ID,

					modifiedAt:
						100
				});

				expect(
					await db.get(
						RESOURCE_RECEIPTS,
						createResourceReceiptId(
							resourcePublisher,
							STRONGS_RESOURCE_ID
						)
					)
				).toEqual({
					id:
						createResourceReceiptId(
							resourcePublisher,
							STRONGS_RESOURCE_ID
						),

					publisher:
						resourcePublisher,

					resourceId:
						STRONGS_RESOURCE_ID,

					modifiedAt:
						200
				});
			}
		);

		it(
			'continues installing descriptors when one resolution strategy is unsupported',
			async () => {
				const collectionPublisher =
					createPublisher();

				const resourcePublisher =
					createPublisher();

				const unsupportedResourceId =
					'kjvonly/future/things/default';

				const chapterContent =
					createChapterContent(
						1
					);

				const strongsContent =
					createStrongsContent(
						'G1'
					);

				const descriptors = [
					createDescriptor({
						publisher:
							resourcePublisher,

						resourceId:
							CHAPTER_RESOURCE_ID,

						category:
							'kjvonly/bible/chapters',

						modifiedAt:
							100
					}),

					createDescriptor({
						publisher:
							resourcePublisher,

						resourceId:
							unsupportedResourceId,

						category:
							'kjvonly/future/things',

						modifiedAt:
							150,

						strategyType:
							'unsupported'
					}),

					createDescriptor({
						publisher:
							resourcePublisher,

						resourceId:
							STRONGS_RESOURCE_ID,

						category:
							'kjvonly/strongs/definitions',

						modifiedAt:
							200
					})
				];

				const {
					service,
					strategy
				} = createService(
					createRepresentation(
						collectionPublisher,
						descriptors
					),
					new Map([
						[
							CHAPTER_RESOURCE_ID,
							encodeJson(
								chapterContent
							)
						],
						[
							STRONGS_RESOURCE_ID,
							encodeJson(
								strongsContent
							)
						]
					])
				);

				const result =
					await service.install({
						publisher:
							collectionPublisher,

						resourceId:
							COLLECTION_RESOURCE_ID
					});

				expect(
					result.found
				).toBe(
					true
				);

				expect(
					result.resources
				).toHaveLength(
					3
				);

				/*
				 * ResourceResolutionResult separates
				 * failures from successful contents,
				 * so ResourceInstallResult does not
				 * guarantee original descriptor order.
				 */
				expect(
					result.resources
				).toEqual(
					expect.arrayContaining([
						{
							reference: {
								publisher:
									resourcePublisher,

								resourceId:
									CHAPTER_RESOURCE_ID
							},

							resourceType:
								'kjvonly/bible/chapters',

							status:
								'handled'
						},

						{
							reference: {
								publisher:
									resourcePublisher,

								resourceId:
									STRONGS_RESOURCE_ID
							},

							resourceType:
								'kjvonly/strongs/definitions',

							status:
								'handled'
						},

						{
							reference: {
								publisher:
									resourcePublisher,

								resourceId:
									unsupportedResourceId
							},

							resourceType:
								'kjvonly/future/things',

							status:
								'failed',

							error:
								expect.any(
									Error
								)
						}
					])
				);

				/*
				 * The unsupported descriptor never
				 * reaches the registered strategy.
				 *
				 * The later Strong's descriptor still
				 * resolves normally.
				 */
				expect(
					strategy.descriptors.map(
						descriptor =>
							descriptor
								.metadata
								.resourceId
					)
				).toEqual([
					CHAPTER_RESOURCE_ID,
					STRONGS_RESOURCE_ID
				]);

				const bibleVersionId =
					createBibleVersionId(
						resourcePublisher,
						'kjvs'
					);

				const chapterId =
					createChapterId(
						bibleVersionId,
						'1_1'
					);

				const strongsId =
					createStrongsId(
						bibleVersionId,
						'G1'
					);

				expect(
					await getDomainObject(
						BIBLE_CHAPTER_OBJECT_TYPE,
						chapterId
					)
				).toEqual({
					id:
						chapterId,

					...chapterContent
				});

				expect(
					await getDomainObject(
						STRONGS_DEFINITION_OBJECT_TYPE,
						strongsId
					)
				).toEqual({
					id:
						strongsId,

					...strongsContent
				});

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_RECEIPTS,
						createResourceReceiptId(
							resourcePublisher,
							CHAPTER_RESOURCE_ID
						)
					)
				).toBeDefined();

				expect(
					await db.get(
						RESOURCE_RECEIPTS,
						createResourceReceiptId(
							resourcePublisher,
							unsupportedResourceId
						)
					)
				).toBeUndefined();

				expect(
					await db.get(
						RESOURCE_RECEIPTS,
						createResourceReceiptId(
							resourcePublisher,
							STRONGS_RESOURCE_ID
						)
					)
				).toBeDefined();
			}
		);

		it(
			'skips descriptor retrieval when Resource receipts are current',
			async () => {
				const collectionPublisher =
					createPublisher();

				const resourcePublisher =
					createPublisher();

				const descriptors = [
					createDescriptor({
						publisher:
							resourcePublisher,

						resourceId:
							CHAPTER_RESOURCE_ID,

						category:
							'kjvonly/bible/chapters',

						modifiedAt:
							100
					}),

					createDescriptor({
						publisher:
							resourcePublisher,

						resourceId:
							STRONGS_RESOURCE_ID,

						category:
							'kjvonly/strongs/definitions',

						modifiedAt:
							200
					})
				];

				const {
					service,
					strategy
				} = createService(
					createRepresentation(
						collectionPublisher,
						descriptors
					),
					new Map([
						[
							CHAPTER_RESOURCE_ID,
							encodeJson(
								createChapterContent(
									1
								)
							)
						],
						[
							STRONGS_RESOURCE_ID,
							encodeJson(
								createStrongsContent(
									'G1'
								)
							)
						]
					])
				);

				const reference = {
					publisher:
						collectionPublisher,

					resourceId:
						COLLECTION_RESOURCE_ID
				};

				const first =
					await service.install(
						reference
					);

				expect(
					first.resources.map(
						resource =>
							resource.status
					)
				).toEqual([
					'handled',
					'handled'
				]);

				expect(
					strategy.descriptors
				).toHaveLength(
					2
				);

				const second =
					await service.install(
						reference
					);

				expect(
					second
				).toEqual({
					requested:
						reference,

					found:
						true,

					resources:
						[]
				});

				/*
				 * Receipt checks happen before
				 * external retrieval, so the strategy
				 * receives no additional calls.
				 */
				expect(
					strategy.descriptors
				).toHaveLength(
					2
				);
			}
		);
	}
);

function createService(
	representation:
		ResourceRepresentation,

	contents:
		ReadonlyMap<
			string,
			Uint8Array
		>
): {
	readonly service:
		ResourceService;

	readonly strategy:
		FakeResourceResolutionStrategy;
} {

	const discovery =
		new FakeDiscovery(
			representation
		);

	const decoratorBuilder =
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

	const receiptStore =
		new IndexedDBResourceReceiptStore(
			getApplicationDB
		);

	const receiptService =
		new ResourceReceiptService(
			receiptStore
		);

	const strategy =
		new FakeResourceResolutionStrategy(
			contents
		);

	const descriptorsResolver =
		new DescriptorsRepresentationResolver(
			new ResourceDescriptorDocumentDecoder(
				decoratorBuilder
			),
			new ResourceDescriptorValidator(),
			receiptService,
			[
				strategy
			]
		);

	const resolver =
		new ResourceResolver([
			new ContentRepresentationResolver(),
			descriptorsResolver
		]);

	const decoder =
		new ResourceContentDecoder(
			decoratorBuilder
		);

	///////////////////////////////////////////////////////////////////////
	// Bible

	const bibleChapterInstallationTransaction =
		new IndexedDBBibleChapterInstallationTransaction(
			getApplicationDB
		);

	const bibleChapterInstaller =
		new BibleChapterInstaller(
			bibleChapterInstallationTransaction
		);

	const bibleChapterHandler =
		new BibleChapterResourceHandler(
			new BibleChapterInterpreter(),
			new BibleChapterValidator(),
			bibleChapterInstaller
		);

	///////////////////////////////////////////////////////////////////////
	// Strong's

	const strongsInstallationTransaction =
		new IndexedDBStrongsInstallationTransaction(
			getApplicationDB
		);

	const strongsInstaller =
		new StrongsInstaller(
			strongsInstallationTransaction
		);

	const strongsHandler =
		new StrongsResourceHandler(
			new StrongsInterpreter(),
			new StrongsValidator(),
			strongsInstaller
		);

	const service =
		new ResourceService(
			discovery,
			resolver,
			decoder,
			receiptService,
			[
				bibleChapterHandler,
				strongsHandler
			]
		);

	return {
		service,
		strategy
	};
}

function createRepresentation(
	publisher: string,
	descriptors:
		readonly ResourceDescriptor[]
): ResourceRepresentation {

	return {
		publisher,

		resourceId:
			COLLECTION_RESOURCE_ID,

		resourceType:
			'kjvonly/resources/collections',

		eventId:
			'c'.repeat(
				64
			),

		modifiedAt:
			300,

		representation:
			'descriptors',

		mediaType:
			'application/json',

		payload:
			JSON.stringify(
				descriptors
			)
	};
}

function createDescriptor(
	options: {
		readonly publisher:
			string;

		readonly resourceId:
			string;

		readonly category:
			string;

		readonly modifiedAt:
			number;

		readonly strategyType?:
			string;
	}
): ResourceDescriptor {

	return {
		metadata: {
			publisher:
				options.publisher,

			resourceId:
				options.resourceId,

			category:
				options.category,

			modifiedAt:
				options.modifiedAt,

			mediaType:
				'application/json'
		},

		strategy: {
			type:
				options.strategyType ??
				'test',

			data:
				{}
		}
	};
}

function createChapterContent(
	number: number
) {
	return {
		number,

		bookName:
			'Genesis',

		verses: {},

		verseMap: {},

		footnotes: {}
	};
}

function createStrongsContent(
	number: string
) {
	return {
		number,

		originalWord:
			number.startsWith(
				'G'
			) ?
				'Α' :
				'אָב',

		partsOfSpeech:
			'noun',

		phoneticSpelling:
			'word',

		transliteratedWord:
			'word',

		usageByBook:
			[],

		usageByWord:
			[],

		brownDef:
			null,

		strongsDef:
			'definition',

		thayersDef:
			null
	};
}

function encodeJson(
	value: unknown
): Uint8Array {

	return new TextEncoder()
		.encode(
			JSON.stringify(
				value
			)
		);
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

async function getDomainObject(
	objectType: string,
	objectId: string
): Promise<
	unknown |
	undefined
> {

	const db =
		await getApplicationDB();

	const stored =
		await db.get(
			DOMAIN_OBJECTS,
			createStoredDomainObjectId(
				objectType,
				objectId
			)
		);

	return stored?.value;
}

class FakeDiscovery {

	constructor(
		private readonly representation:
			ResourceRepresentation
	) {}

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

class FakeResourceResolutionStrategy
	implements ResourceResolutionStrategy {

	readonly type =
		'test';

	readonly descriptors:
		ResourceDescriptor[] =
			[];

	constructor(
		private readonly contents:
			ReadonlyMap<
				string,
				Uint8Array
			>
	) {}

	async resolve(
		descriptor:
			ResourceDescriptor
	): Promise<
		Uint8Array
	> {

		this.descriptors.push(
			descriptor
		);

		const content =
			this.contents.get(
				descriptor
					.metadata
					.resourceId
			);

		if (
			content ===
			undefined
		) {
			throw new Error(
				`Missing fake Resource content: ${descriptor.metadata.resourceId}`
			);
		}

		return content;
	}
}
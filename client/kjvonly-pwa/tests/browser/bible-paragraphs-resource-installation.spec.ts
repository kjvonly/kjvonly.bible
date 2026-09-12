import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference,
	ResourceRepresentation,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

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
	BIBLE_PARAGRAPHS_RESOURCE_TYPE,
	BibleParagraphsInterpreter
} from '$lib/domains/bible/resources/paragraphs/bible-paragraphs-interpreter';

import {
	BibleParagraphsValidator
} from '$lib/domains/bible/resources/paragraphs/bible-paragraphs-validator';

import {
	BibleParagraphsInstaller
} from '$lib/domains/bible/resources/paragraphs/bible-paragraphs-installer';

import {
	BibleParagraphsResourceHandler
} from '$lib/domains/bible/resources/paragraphs/bible-paragraphs-resource-handler';

import {
	BIBLE_PARAGRAPHS_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-paragraphs-store';

import {
	IndexedDBBibleParagraphsStore
} from '$lib/domains/bible/persistence/indexeddb-bible-paragraphs-store';

import {
	IndexedDBBibleParagraphsInstallationTransaction
} from '$lib/domains/bible/persistence/bible-paragraphs-installation-transaction';

import {
	createBibleParagraphsId
} from '$lib/domains/bible/models/bible-paragraphs.model';

import {
	ResourceService
} from '$lib/resource/services/resource.service';

import {
	ResourceProcessor
} from '$lib/resource/services/resource-processor';

import {
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	createResourceInstallationId
} from '$lib/resource/installation/resource-installation';

import {
	IndexedDBResourceReceiptStore
} from '$lib/resource/receipts/indexeddb-resource-receipt-store';

import {
	ResourceReceiptService
} from '$lib/resource/receipts/resource-receipt.service';

import {
	createResourceReceiptId
} from '$lib/resource/receipts/resource-receipt';

import type {
	ResourceResolutionResult
} from '$lib/resource/resolution/resource-resolution-result';

describe(
	'Bible Paragraphs Resource installation',
	() => {
		it(
			'decodes validates and installs a Paragraph bundle into IndexedDB',
			async () => {
				const publisher =
					createPublisher();

				const resourceId =
					'kjvonly/overlays/paragraphs/default';

				const content = {
					'1_1': {
						'1_1_1_0': {},
						'1_1_6_0': {},
						'1_1_12_7': {}
					},

					'1_2':
						null
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
								BIBLE_PARAGRAPHS_RESOURCE_TYPE,

							status:
								'handled'
						}
					]
				});

				const paragraphsStore =
					new IndexedDBBibleParagraphsStore(
						getApplicationDB
					);

				const chapter1Id =
					createBibleParagraphsId(
						publisher,
						'default',
						'1_1'
					);

				const chapter2Id =
					createBibleParagraphsId(
						publisher,
						'default',
						'1_2'
					);

				expect(
					await paragraphsStore.get(
						chapter1Id
					)
				).toEqual({
					id:
						chapter1Id,

					chapterRef:
						'1_1',

					paragraphs:
						content['1_1']
				});

				expect(
					await paragraphsStore.get(
						chapter2Id
					)
				).toEqual({
					id:
						chapter2Id,

					chapterRef:
						'1_2',

					paragraphs:
						{}
				});

				const installationId =
					createResourceInstallationId(
						BIBLE_PARAGRAPHS_OBJECT_TYPE,
						chapter1Id
					);

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						installationId
					)
				).toEqual({
					id:
						installationId,

					objectType:
						BIBLE_PARAGRAPHS_OBJECT_TYPE,

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
			'installs nothing when one Paragraph Chapter fails validation',
			async () => {
				const publisher =
					createPublisher();

				const resourceId =
					'kjvonly/overlays/paragraphs/default';

				const service =
					createService([
						createVerifiedContent({
							publisher,
							resourceId,

							content:
								JSON.stringify({
									'1_1': {
										'1_1_1_0': {}
									},

									'1_2': {
										'1_3_1_0': {}
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
							BIBLE_PARAGRAPHS_RESOURCE_TYPE,

						status:
							'failed',

						error:
							expect.any(
								Error
							)
					}
				]);

				const paragraphsStore =
					new IndexedDBBibleParagraphsStore(
						getApplicationDB
					);

				const chapter1Id =
					createBibleParagraphsId(
						publisher,
						'default',
						'1_1'
					);

				const chapter2Id =
					createBibleParagraphsId(
						publisher,
						'default',
						'1_2'
					);

				expect(
					await paragraphsStore.get(
						chapter1Id
					)
				).toBeUndefined();

				expect(
					await paragraphsStore.get(
						chapter2Id
					)
				).toBeUndefined();

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							BIBLE_PARAGRAPHS_OBJECT_TYPE,
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

	const installationTransaction =
		new IndexedDBBibleParagraphsInstallationTransaction(
			getApplicationDB
		);

	const installer =
		new BibleParagraphsInstaller(
			installationTransaction
		);

	const handler =
		new BibleParagraphsResourceHandler(
			new BibleParagraphsInterpreter(),
			new BibleParagraphsValidator(),
			installer
		);

	const processor =
		new ResourceProcessor(
			resolver,
			decoder,
			receiptService,
			[
				handler
			]
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
			'kjvonly/overlays/paragraphs/default',

		resourceType:
			BIBLE_PARAGRAPHS_RESOURCE_TYPE,

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
			'kjvonly/overlays/paragraphs/default',

		resourceType:
			BIBLE_PARAGRAPHS_RESOURCE_TYPE,

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

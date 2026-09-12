import {
	describe,
	expect,
	it
} from 'vitest';

import FlexSearch from 'flexsearch';

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
	BIBLE_SEARCH_RESOURCE_TYPE,
	BibleSearchIndexInterpreter
} from '$lib/domains/bible/resources/search/bible-search-index-interpreter';

import {
	BibleSearchIndexValidator
} from '$lib/domains/bible/resources/search/bible-search-index-validator';

import {
	BibleSearchIndexInstaller
} from '$lib/domains/bible/resources/search/bible-search-index-installer';

import {
	BibleSearchIndexResourceHandler
} from '$lib/domains/bible/resources/search/bible-search-index-resource-handler';

import {
	BIBLE_SEARCH_INDEX_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-search-index-store';

import {
	IndexedDBBibleSearchIndexStore
} from '$lib/domains/bible/persistence/indexeddb-bible-search-index-store';

import {
	IndexedDBBibleSearchIndexInstallationTransaction
} from '$lib/domains/bible/persistence/bible-search-index-installation-transaction';

import {
	createBibleSearchIndexId,
	type BibleSearchIndexChunks
} from '$lib/domains/bible/models/bible-search-index.model';

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
	'Bible Search Index Resource installation',
	() => {
		it(
			'decodes validates installs and restores a real FlexSearch export from IndexedDB',
			async () => {
				const publisher =
					createPublisher();

				const resourceId =
					'kjvonly/bible/search/kjvs';

				const chunks =
					await createFlexSearchExport();

				const service =
					createService([
						createVerifiedContent({
							publisher,
							resourceId,

							content:
								JSON.stringify(
									chunks
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
								BIBLE_SEARCH_RESOURCE_TYPE,

							status:
								'handled'
						}
					]
				});

				const searchIndexId =
					createBibleSearchIndexId(
						publisher,
						'kjvs'
					);

				const searchIndexStore =
					new IndexedDBBibleSearchIndexStore(
						getApplicationDB
					);

				const installed =
					await searchIndexStore.get(
						searchIndexId
					);

				expect(
					installed
				).toEqual({
					id:
						searchIndexId,

					version:
						'kjvs',

					chunks
				});

				const restoredIndex =
					new FlexSearch.Index();

				for (
					const [
						key,
						data
					] of Object.entries(
						installed!.chunks
					)
				) {
					await restoredIndex.import(
						key,
						data
					);
				}

				expect(
					await restoredIndex.searchAsync(
						'beginning'
					)
				).toContain(
					'1_1_1'
				);

				expect(
					await restoredIndex.searchAsync(
						'earth'
					)
				).toContain(
					'1_1_2'
				);

				const installationId =
					createResourceInstallationId(
						BIBLE_SEARCH_INDEX_OBJECT_TYPE,
						searchIndexId
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
						BIBLE_SEARCH_INDEX_OBJECT_TYPE,

					objectId:
						searchIndexId,

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
			'installs nothing when the FlexSearch export is incomplete',
			async () => {
				const publisher =
					createPublisher();

				const resourceId =
					'kjvonly/bible/search/kjvs';

				const chunks =
					await createFlexSearchExport();

				const {
					ctx: _,
					...invalidChunks
				} =
					chunks;

				const service =
					createService([
						createVerifiedContent({
							publisher,
							resourceId,

							content:
								JSON.stringify(
									invalidChunks
								)
						})
					]);

				const result =
					await service.install({
						publisher,
						resourceId
					});

				expect(
					result.resources
				).toEqual([
					{
						reference: {
							publisher,
							resourceId
						},

						resourceType:
							BIBLE_SEARCH_RESOURCE_TYPE,

						status:
							'failed',

						error:
							expect.any(
								Error
							)
					}
				]);

				const searchIndexId =
					createBibleSearchIndexId(
						publisher,
						'kjvs'
					);

				const searchIndexStore =
					new IndexedDBBibleSearchIndexStore(
						getApplicationDB
					);

				expect(
					await searchIndexStore.get(
						searchIndexId
					)
				).toBeUndefined();

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							BIBLE_SEARCH_INDEX_OBJECT_TYPE,
							searchIndexId
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

async function createFlexSearchExport():
	Promise<BibleSearchIndexChunks> {
	const index =
		new FlexSearch.Index();

	await index.addAsync(
		'1_1_1',
		'Gen 1:1 In the beginning God created the heaven and the earth.'
	);

	await index.addAsync(
		'1_1_2',
		'Gen 1:2 And the earth was without form and void.'
	);

	const chunks:
		Record<string, string> =
		{};

	await index.export(
		(
			key: string,
			data: string | undefined
		) => {
			chunks[key] =
				data !== undefined
					? data
					: '';
		}
	);

	return chunks as
		BibleSearchIndexChunks;
}

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
		new IndexedDBBibleSearchIndexInstallationTransaction(
			getApplicationDB
		);

	const installer =
		new BibleSearchIndexInstaller(
			installationTransaction
		);

	const handler =
		new BibleSearchIndexResourceHandler(
			new BibleSearchIndexInterpreter(),
			new BibleSearchIndexValidator(),
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
			'kjvonly/bible/search/kjvs',

		resourceType:
			BIBLE_SEARCH_RESOURCE_TYPE,

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
			'kjvonly/bible/search/kjvs',

		resourceType:
			BIBLE_SEARCH_RESOURCE_TYPE,

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

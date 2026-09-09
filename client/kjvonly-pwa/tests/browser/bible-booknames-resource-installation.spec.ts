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
	BibleBooknamesInterpreter,
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from '$lib/domains/bible/resources/booknames/bible-booknames-interpreter';

import {
	BibleBooknamesValidator
} from '$lib/domains/bible/resources/booknames/bible-booknames-validator';

import {
	BibleBooknamesInstaller
} from '$lib/domains/bible/resources/booknames/bible-booknames-installer';

import {
	BibleBooknamesResourceHandler
} from '$lib/domains/bible/resources/booknames/bible-booknames-resource-handler';

import {
	BIBLE_BOOKNAMES_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-booknames-store';

import {
	IndexedDBBibleBooknamesStore
} from '$lib/domains/bible/persistence/indexeddb-bible-booknames-store';

import {
	IndexedDBBibleBooknamesInstallationTransaction
} from '$lib/domains/bible/persistence/bible-booknames-installation-transaction';

import {
	createBibleBooknamesId
} from '$lib/domains/bible/models/bible-booknames.model';

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
	'Bible Booknames Resource installation',
	() => {
		it(
			'decodes validates and installs Bible Booknames into IndexedDB',
			async () => {
				const publisher =
					createPublisher();

				const resourceId =
					'kjvonly/bible/booknames/default';

				const content =
					createBooknamesContent();

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
								BIBLE_BOOKNAMES_RESOURCE_TYPE,

							status:
								'handled'
						}
					]
				});

				const booknamesId =
					createBibleBooknamesId(
						publisher,
						'default'
					);

				const booknamesStore =
					new IndexedDBBibleBooknamesStore(
						getApplicationDB
					);

				expect(
					await booknamesStore.get(
						booknamesId
					)
				).toEqual({
					id:
						booknamesId,

					...content
				});

				const installationId =
					createResourceInstallationId(
						BIBLE_BOOKNAMES_OBJECT_TYPE,
						booknamesId
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
						BIBLE_BOOKNAMES_OBJECT_TYPE,

					objectId:
						booknamesId,

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
			'installs nothing when Bible Booknames validation fails',
			async () => {
				const publisher =
					createPublisher();

				const resourceId =
					'kjvonly/bible/booknames/default';

				const invalidContent =
					createBooknamesContent();

				invalidContent
					.booknamesByName
					.Genesis =
						2;

				const service =
					createService([
						createVerifiedContent({
							publisher,
							resourceId,

							content:
								JSON.stringify(
									invalidContent
								)
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
							BIBLE_BOOKNAMES_RESOURCE_TYPE,

						status:
							'failed',

						error:
							expect.any(
								Error
							)
					}
				]);

				const booknamesId =
					createBibleBooknamesId(
						publisher,
						'default'
					);

				const booknamesStore =
					new IndexedDBBibleBooknamesStore(
						getApplicationDB
					);

				expect(
					await booknamesStore.get(
						booknamesId
					)
				).toBeUndefined();

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							BIBLE_BOOKNAMES_OBJECT_TYPE,
							booknamesId
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
		new IndexedDBBibleBooknamesInstallationTransaction(
			getApplicationDB
		);

	const installer =
		new BibleBooknamesInstaller(
			installationTransaction
		);

	const handler =
		new BibleBooknamesResourceHandler(
			new BibleBooknamesInterpreter(),
			new BibleBooknamesValidator(),
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
			'kjvonly/bible/booknames/default',

		resourceType:
			BIBLE_BOOKNAMES_RESOURCE_TYPE,

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
			'kjvonly/bible/booknames/default',

		resourceType:
			BIBLE_BOOKNAMES_RESOURCE_TYPE,

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

function createBooknamesContent() {
	return {
		booknamesById: {
			'1':
				'Genesis',

			'2':
				'Exodus'
		},

		booknamesByName: {
			Genesis:
				1,

			Exodus:
				2
		},

		shortNames: {
			'1':
				'Gen',

			'2':
				'Exo'
		},

		maxChapterById: {
			'1':
				2,

			'2':
				1
		},

		bookchapterversecountById: {
			'1': {
				'1':
					31,

				'2':
					25
			},

			'2': {
				'1':
					22
			}
		}
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

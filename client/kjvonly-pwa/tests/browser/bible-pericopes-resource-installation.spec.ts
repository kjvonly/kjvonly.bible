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
	BIBLE_PERICOPES_RESOURCE_TYPE,
	BiblePericopesInterpreter
} from '$lib/domains/bible/resources/pericopes/bible-pericopes-interpreter';

import {
	BiblePericopesValidator
} from '$lib/domains/bible/resources/pericopes/bible-pericopes-validator';

import {
	BiblePericopesInstaller
} from '$lib/domains/bible/resources/pericopes/bible-pericopes-installer';

import {
	BiblePericopesResourceHandler
} from '$lib/domains/bible/resources/pericopes/bible-pericopes-resource-handler';

import {
	BIBLE_PERICOPES_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-pericopes-store';

import {
	IndexedDBBiblePericopesStore
} from '$lib/domains/bible/persistence/indexeddb-bible-pericopes-store';

import {
	IndexedDBBiblePericopesInstallationTransaction
} from '$lib/domains/bible/persistence/bible-pericopes-installation-transaction';

import {
	createBiblePericopesId
} from '$lib/domains/bible/models/bible-pericopes.model';

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
	'Bible Pericopes Resource installation',
	() => {
		it(
			'decodes validates and installs a Pericope bundle into IndexedDB',
			async () => {
				const publisher =
					createPublisher();

				const resourceId =
					'kjvonly/overlays/pericopes/default';

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
					'kjvonly/overlays/pericopes/default';

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

	const installationTransaction =
		new IndexedDBBiblePericopesInstallationTransaction(
			getApplicationDB
		);

	const installer =
		new BiblePericopesInstaller(
			installationTransaction
		);

	const handler =
		new BiblePericopesResourceHandler(
			new BiblePericopesInterpreter(),
			new BiblePericopesValidator(),
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
			'kjvonly/overlays/pericopes/default',

		resourceType:
			BIBLE_PERICOPES_RESOURCE_TYPE,

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
			'kjvonly/overlays/pericopes/default',

		resourceType:
			BIBLE_PERICOPES_RESOURCE_TYPE,

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

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	GenericResourceInstaller,
	ResourceDataTypeResolver,
	ResourceDomainObjectFactoryResolver,
	createResourceInstallationId,
	createResourceReceiptId
} from '$lib/resource';

import {
	BIBLE_PARAGRAPHS_DATA_TYPE,
	BIBLE_PARAGRAPHS_DATA_VERSION,
	BIBLE_PARAGRAPHS_RESOURCE_TYPE,
	BibleParagraphsDataTypeHandler,
	BibleParagraphsDomainObjectFactory
} from '$lib/domains/bible';

import {
	BIBLE_PARAGRAPHS_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-paragraphs-store';

import {
	IndexedDBBibleParagraphsStore
} from '$lib/domains/bible/persistence/indexeddb-bible-paragraphs-store';

import {
	createBibleParagraphsId
} from '$lib/domains/bible/models/bible-paragraphs.model';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	IndexedDBGenericResourceInstallationTransaction
} from '$lib/resource/installation/indexeddb-generic-resource-installation-transaction';

import {
	createBrowserTestPublisher,
	createGenericResourceInstallationTestService
} from './support/resource-installation-test-service';

describe(
	'Bible Paragraphs Resource installation',
	() => {
		it(
			'decodes validates and installs a Paragraph bundle into IndexedDB through the generic installer',
			async () => {
				const publisher =
					createBrowserTestPublisher();

				const resourceId =
					`kjvonly/bible/paragraphs/default`;

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
					createGenericResourceInstallationTestService(
						createInstaller(),
						{
							publisher,
							resourceId,
							resourceType:
								BIBLE_PARAGRAPHS_RESOURCE_TYPE,
							dataType:
								BIBLE_PARAGRAPHS_DATA_TYPE,
							dataVersion:
								BIBLE_PARAGRAPHS_DATA_VERSION,
							value:
								content
						}
					);

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
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							BIBLE_PARAGRAPHS_OBJECT_TYPE,
							chapter1Id
						)
					)
				).toEqual({
					id:
						createStoredDomainObjectId(
							BIBLE_PARAGRAPHS_OBJECT_TYPE,
							chapter1Id
						),
					objectType:
						BIBLE_PARAGRAPHS_OBJECT_TYPE,
					objectId:
						chapter1Id,
					dataType:
						BIBLE_PARAGRAPHS_DATA_TYPE,
					dataVersion:
						BIBLE_PARAGRAPHS_DATA_VERSION,
					value: {
						id:
							chapter1Id,
						chapterRef:
							'1_1',
						paragraphs:
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
			'installs nothing when one Paragraph Chapter fails Domain validation',
			async () => {
				const publisher =
					createBrowserTestPublisher();

				const resourceId =
					`kjvonly/bible/paragraphs/default`;

				const service =
					createGenericResourceInstallationTestService(
						createInstaller(),
						{
							publisher,
							resourceId,
							resourceType:
								BIBLE_PARAGRAPHS_RESOURCE_TYPE,
							dataType:
								BIBLE_PARAGRAPHS_DATA_TYPE,
							dataVersion:
								BIBLE_PARAGRAPHS_DATA_VERSION,
							value: {
								'1_1': {
									'1_1_1_0': {}
								},

								'1_2': {
									'1_3_1_0': {}
								}
							}
						}
					);

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

function createInstaller():
	GenericResourceInstaller {
	return new GenericResourceInstaller(
		new ResourceDataTypeResolver([
			new BibleParagraphsDataTypeHandler()
		]),
		new ResourceDomainObjectFactoryResolver([
			new BibleParagraphsDomainObjectFactory()
		]),
		new IndexedDBGenericResourceInstallationTransaction(
			getApplicationDB
		)
	);
}

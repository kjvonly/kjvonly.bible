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
	BIBLE_TEXT_MARKUP_DATA_TYPE,
	BIBLE_TEXT_MARKUP_DATA_VERSION,
	BIBLE_TEXT_MARKUP_RESOURCE_TYPE,
	BibleTextMarkupDataTypeHandler,
	BibleTextMarkupDomainObjectFactory
} from '$lib/domains/bible';

import {
	BIBLE_TEXT_MARKUP_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-text-markup-store';

import {
	IndexedDBBibleTextMarkupStore
} from '$lib/domains/bible/persistence/indexeddb-bible-text-markup-store';

import {
	createBibleTextMarkupId
} from '$lib/domains/bible/models/bible-text-markup.model';

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
	'Bible Text Markup Resource installation',
	() => {
		it(
			'decodes validates and installs a Text Markup bundle into IndexedDB through the generic installer',
			async () => {
				const publisher =
					createBrowserTestPublisher();

				const resourceId =
					`kjvonly/bible/text-markup/kjvs`;

				const content = {
					'1_1': {
						'1': {
							'0': {
								class: [
									'highlight'
								]
							},

							'2': {
								class: [
									'note'
								]
							}
						}
					},

					'1_2': {}
				};

				const service =
					createGenericResourceInstallationTestService(
						createInstaller(),
						{
							publisher,
							resourceId,
							resourceType:
								BIBLE_TEXT_MARKUP_RESOURCE_TYPE,
							dataType:
								BIBLE_TEXT_MARKUP_DATA_TYPE,
							dataVersion:
								BIBLE_TEXT_MARKUP_DATA_VERSION,
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
								BIBLE_TEXT_MARKUP_RESOURCE_TYPE,

							status:
								'handled'
						}
					]
				});

				const textMarkupStore =
					new IndexedDBBibleTextMarkupStore(
						getApplicationDB
					);

				const chapter1Id =
					createBibleTextMarkupId(
						publisher,
						'kjvs',
						'1_1'
					);

				const chapter2Id =
					createBibleTextMarkupId(
						publisher,
						'kjvs',
						'1_2'
					);

				expect(
					await textMarkupStore.get(
						chapter1Id
					)
				).toEqual({
					id:
						chapter1Id,

					chapterRef:
						'1_1',

					markings:
						content['1_1']
				});

				expect(
					await textMarkupStore.get(
						chapter2Id
					)
				).toEqual({
					id:
						chapter2Id,

					chapterRef:
						'1_2',

					markings:
						{}
				});

				const installationId =
					createResourceInstallationId(
						BIBLE_TEXT_MARKUP_OBJECT_TYPE,
						chapter1Id
					);

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							BIBLE_TEXT_MARKUP_OBJECT_TYPE,
							chapter1Id
						)
					)
				).toEqual({
					id:
						createStoredDomainObjectId(
							BIBLE_TEXT_MARKUP_OBJECT_TYPE,
							chapter1Id
						),

					objectType:
						BIBLE_TEXT_MARKUP_OBJECT_TYPE,

					objectId:
						chapter1Id,

					dataType:
						BIBLE_TEXT_MARKUP_DATA_TYPE,

					dataVersion:
						BIBLE_TEXT_MARKUP_DATA_VERSION,

					value: {
						id:
							chapter1Id,

						chapterRef:
							'1_1',

						markings:
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
						BIBLE_TEXT_MARKUP_OBJECT_TYPE,

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
			'installs nothing when one Text Markup Chapter fails Domain validation',
			async () => {
				const publisher =
					createBrowserTestPublisher();

				const resourceId =
					`kjvonly/bible/text-markup/kjvs`;

				const service =
					createGenericResourceInstallationTestService(
						createInstaller(),
						{
							publisher,
							resourceId,
							resourceType:
								BIBLE_TEXT_MARKUP_RESOURCE_TYPE,
							dataType:
								BIBLE_TEXT_MARKUP_DATA_TYPE,
							dataVersion:
								BIBLE_TEXT_MARKUP_DATA_VERSION,
							value: {
								'1_1': {
									'1': {
										'0': {
											class: [
												'highlight'
											]
										}
									}
								},

								'01_2': {}
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
							BIBLE_TEXT_MARKUP_RESOURCE_TYPE,

						status:
							'failed',

						error:
							expect.any(
								Error
							)
					}
				]);

				const textMarkupStore =
					new IndexedDBBibleTextMarkupStore(
						getApplicationDB
					);

				const chapter1Id =
					createBibleTextMarkupId(
						publisher,
						'kjvs',
						'1_1'
					);

				expect(
					await textMarkupStore.get(
						chapter1Id
					)
				).toBeUndefined();

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							BIBLE_TEXT_MARKUP_OBJECT_TYPE,
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
			new BibleTextMarkupDataTypeHandler()
		]),
		new ResourceDomainObjectFactoryResolver([
			new BibleTextMarkupDomainObjectFactory()
		]),
		new IndexedDBGenericResourceInstallationTransaction(
			getApplicationDB
		)
	);
}

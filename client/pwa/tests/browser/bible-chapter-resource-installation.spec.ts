import {
	beforeEach,
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
	BIBLE_CHAPTER_DATA_TYPE,
	BIBLE_CHAPTER_DATA_VERSION,
	BIBLE_CHAPTER_RESOURCE_TYPE,
	BibleChapterDataTypeHandler,
	BibleChapterDomainObjectFactory
} from '$lib/domains/bible';

import {
	BIBLE_CHAPTER_OBJECT_TYPE
} from '$lib/domains/bible/persistence/chapter-store';

import {
	BIBLE_VERSION_OBJECT_TYPE
} from '$lib/domains/bible/persistence/bible-version-store';

import {
	createBibleVersionId,
	createChapterId
} from '$lib/domains/bible/utils/bible-identity';

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

const BIBLE_ID =
	'kjvs-resource-id';

const SEMANTIC_VERSION =
	'King James Version';

describe(
	'Bible Chapter Resource installation',
	() => {
		beforeEach(
			async () => {
				const db =
					await getApplicationDB();

				await db.clear(
					DOMAIN_OBJECTS
				);

				await db.clear(
					RESOURCE_INSTALLATIONS
				);

				await db.clear(
					RESOURCE_RECEIPTS
				);
			}
		);

		it(
			'installs a bundle with Domain identity from bibleId and semantic version from Resource metadata',
			async () => {
				const publisher =
					createBrowserTestPublisher();

				const resourceId =
					`kjvonly/bible/chapter/${BIBLE_ID}`;

				const service =
					createGenericResourceInstallationTestService(
						createInstaller(),
						{
							publisher,
							resourceId,
							resourceType:
								BIBLE_CHAPTER_RESOURCE_TYPE,
							dataType:
								BIBLE_CHAPTER_DATA_TYPE,
							dataVersion:
								BIBLE_CHAPTER_DATA_VERSION,
							metadata: {
								version:
									SEMANTIC_VERSION
							},
							value: {
								[`${BIBLE_ID}/1_1`]:
									createChapterContent(
										1
									),

								[`${BIBLE_ID}/1_2`]:
									createChapterContent(
										2
									)
							}
						}
					);

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
							BIBLE_CHAPTER_RESOURCE_TYPE,

						status:
							'handled'
					}
				]);

				const bibleVersionId =
					createBibleVersionId(
						publisher,
						BIBLE_ID
					);

				const chapter1Id =
					createChapterId(
						bibleVersionId,
						'1_1'
					);

				const chapter2Id =
					createChapterId(
						bibleVersionId,
						'1_2'
					);

				await expect(
					getDomainObject(
						BIBLE_VERSION_OBJECT_TYPE,
						bibleVersionId
					)
				).resolves.toEqual({
					id:
						bibleVersionId,

					publisher,

					version:
						SEMANTIC_VERSION
				});

				await expect(
					getDomainObject(
						BIBLE_CHAPTER_OBJECT_TYPE,
						chapter1Id
					)
				).resolves.toEqual({
					id:
						chapter1Id,

					...createChapterContent(
						1
					)
				});

				await expect(
					getDomainObject(
						BIBLE_CHAPTER_OBJECT_TYPE,
						chapter2Id
					)
				).resolves.toEqual({
					id:
						chapter2Id,

					...createChapterContent(
						2
					)
				});

				const db =
					await getApplicationDB();

				await expect(
					db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							BIBLE_VERSION_OBJECT_TYPE,
							bibleVersionId
						)
					)
				).resolves.toEqual({
					id:
						createResourceInstallationId(
							BIBLE_VERSION_OBJECT_TYPE,
							bibleVersionId
						),

					objectType:
						BIBLE_VERSION_OBJECT_TYPE,

					objectId:
						bibleVersionId,

					publisher,

					resourceId,

					metadata: {
						version:
							SEMANTIC_VERSION
					},

					modifiedAt:
						200
				});

				await expect(
					db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							BIBLE_CHAPTER_OBJECT_TYPE,
							chapter1Id
						)
					)
				).resolves.toEqual({
					id:
						createResourceInstallationId(
							BIBLE_CHAPTER_OBJECT_TYPE,
							chapter1Id
						),

					objectType:
						BIBLE_CHAPTER_OBJECT_TYPE,

					objectId:
						chapter1Id,

					publisher,

					resourceId,

					metadata: {
						version:
							SEMANTIC_VERSION
					},

					modifiedAt:
						200
				});

				await expect(
					db.get(
						RESOURCE_RECEIPTS,
						createResourceReceiptId(
							publisher,
							resourceId
						)
					)
				).resolves.toMatchObject({
					publisher,
					resourceId,
					modifiedAt:
						200
				});
			}
		);

		it(
			'installs nothing when one Chapter in a bundle violates Bible invariants',
			async () => {
				const publisher =
					createBrowserTestPublisher();

				const resourceId =
					`kjvonly/bible/chapter/${BIBLE_ID}`;

				const service =
					createGenericResourceInstallationTestService(
						createInstaller(),
						{
							publisher,
							resourceId,
							resourceType:
								BIBLE_CHAPTER_RESOURCE_TYPE,
							dataType:
								BIBLE_CHAPTER_DATA_TYPE,
							dataVersion:
								BIBLE_CHAPTER_DATA_VERSION,
							metadata: {
								version:
									SEMANTIC_VERSION
							},
							value: {
								[`${BIBLE_ID}/1_1`]:
									createChapterContent(
										1
									),

								[`${BIBLE_ID}/1_2`]:
									createChapterContent(
										3
									)
							}
						}
					);

				const result =
					await service.install({
						publisher,
						resourceId
					});

				expect(
					result.resources[0]
				).toMatchObject({
					status:
						'failed'
				});

				const bibleVersionId =
					createBibleVersionId(
						publisher,
						BIBLE_ID
					);

				await expect(
					getDomainObject(
						BIBLE_VERSION_OBJECT_TYPE,
						bibleVersionId
					)
				).resolves.toBeUndefined();

				await expect(
					getDomainObject(
						BIBLE_CHAPTER_OBJECT_TYPE,
						createChapterId(
							bibleVersionId,
							'1_1'
						)
					)
				).resolves.toBeUndefined();
			}
		);
	}
);

function createInstaller():
	GenericResourceInstaller {
	return new GenericResourceInstaller(
		new ResourceDataTypeResolver([
			new BibleChapterDataTypeHandler(),
		]),
		new ResourceDomainObjectFactoryResolver([
			new BibleChapterDomainObjectFactory()
		]),
		new IndexedDBGenericResourceInstallationTransaction(
			getApplicationDB
		)
	);
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

async function getDomainObject(
	objectType: string,
	objectId: string
): Promise<unknown | undefined> {
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

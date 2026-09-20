import {
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	createBrowserKJVOnlyArchiveWorkerClient
} from '$lib/application/archive/worker/kjvonly-archive-worker-client';

import {
	KJVOnlyArchiveCodec
} from '$lib/application/archive/kjvonly-archive-codec';

import {
	BIBLE_CHAPTER_OBJECT_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-installer';

import {
	createBibleVersionId,
	createChapterId
} from '$lib/domains/bible/utils/bible-identity';

import {
	STRONGS_DEFINITION_OBJECT_TYPE
} from '$lib/domains/strongs/persistence/strongs-store';

import {
	createStrongsId
} from '$lib/domains/strongs/utils/strongs-identity';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	createStoredDomainObjectId,
	getApplicationDB,
	type StoredDomainObject
} from '$lib/infrastructure/persistence/application.db';

import {
	createResourceReceiptId,
	type ResourceInstallation
} from '$lib/resource';

const CHAPTER_BUNDLE_RESOURCE_ID =
	'kjvonly/bible/chapters/kjvs';

const CHAPTER_RESOURCE_ID =
	'kjvonly/bible/chapters/kjvs/1_1';

const STRONGS_BUNDLE_RESOURCE_ID =
	'kjvonly/strongs/definitions/kjvs';

const STRONGS_RESOURCE_ID =
	'kjvonly/strongs/definitions/kjvs/G1';

describe(
	'KJVOnly Archive Worker round trip',
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
			'exports bundle-derived Bible and Strong\'s state and imports it as canonical individual Resources',
			async () => {
				const publisher =
					'a'.repeat(
						64
					);

				const bibleVersionId =
					createBibleVersionId(
						publisher,
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

				const chapterStoredId =
					createStoredDomainObjectId(
						BIBLE_CHAPTER_OBJECT_TYPE,
						chapterId
					);

				const strongsStoredId =
					createStoredDomainObjectId(
						STRONGS_DEFINITION_OBJECT_TYPE,
						strongsId
					);

				const chapterObject:
					StoredDomainObject = {
						id:
							chapterStoredId,

						objectType:
							BIBLE_CHAPTER_OBJECT_TYPE,

						objectId:
							chapterId,

						value: {
							id:
								chapterId,

							...createChapterContent()
						}
					};

				const strongsObject:
					StoredDomainObject = {
						id:
							strongsStoredId,

						objectType:
							STRONGS_DEFINITION_OBJECT_TYPE,

						objectId:
							strongsId,

						value: {
							id:
								strongsId,

							...createStrongsContent()
						}
					};

				const chapterInstallation:
					ResourceInstallation = {
						id:
							chapterStoredId,

						objectType:
							BIBLE_CHAPTER_OBJECT_TYPE,

						objectId:
							chapterId,

						publisher,

						resourceId:
							CHAPTER_BUNDLE_RESOURCE_ID,

						modifiedAt:
							200
					};

				const strongsInstallation:
					ResourceInstallation = {
						id:
							strongsStoredId,

						objectType:
							STRONGS_DEFINITION_OBJECT_TYPE,

						objectId:
							strongsId,

						publisher,

						resourceId:
							STRONGS_BUNDLE_RESOURCE_ID,

						modifiedAt:
							201
					};

				const db =
					await getApplicationDB();

				const seed =
					db.transaction(
						[
							DOMAIN_OBJECTS,
							RESOURCE_INSTALLATIONS
						],
						'readwrite'
					);

				await seed
					.objectStore(
						DOMAIN_OBJECTS
					)
					.put(
						chapterObject
					);

				await seed
					.objectStore(
						DOMAIN_OBJECTS
					)
					.put(
						strongsObject
					);

				await seed
					.objectStore(
						RESOURCE_INSTALLATIONS
					)
					.put(
						chapterInstallation
					);

				await seed
					.objectStore(
						RESOURCE_INSTALLATIONS
					)
					.put(
						strongsInstallation
					);

				await seed.done;

				const client =
					createBrowserKJVOnlyArchiveWorkerClient();

				const archiveBytes =
					await client.export({
						types: [
							{
								objectType:
									BIBLE_CHAPTER_OBJECT_TYPE
							},
							{
								objectType:
									STRONGS_DEFINITION_OBJECT_TYPE
							}
						]
					});

				const archive =
					await new KJVOnlyArchiveCodec()
						.decode(
							archiveBytes
						);

				expect(
					archive.resource_installations[
						chapterStoredId
					]?.resourceId
				).toBe(
					CHAPTER_BUNDLE_RESOURCE_ID
				);

				expect(
					archive.resource_installations[
						strongsStoredId
					]?.resourceId
				).toBe(
					STRONGS_BUNDLE_RESOURCE_ID
				);

				await db.clear(
					DOMAIN_OBJECTS
				);

				await db.clear(
					RESOURCE_INSTALLATIONS
				);

				const result =
					await client.import(
						archiveBytes
					);

				expect(
					result.resources
				).toEqual(
					expect.arrayContaining([
						{
							id:
								chapterStoredId,

							status:
								'handled',

							resourceType:
								'kjvonly/bible/chapters',

							resourceId:
								CHAPTER_RESOURCE_ID
						},
						{
							id:
								strongsStoredId,

							status:
								'handled',

							resourceType:
								'kjvonly/strongs/definitions',

							resourceId:
								STRONGS_RESOURCE_ID
						}
					])
				);

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						chapterStoredId
					)
				).toEqual(
					chapterObject
				);

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						strongsStoredId
					)
				).toEqual(
					strongsObject
				);

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						chapterStoredId
					)
				).toEqual({
					id:
						chapterStoredId,

					objectType:
						BIBLE_CHAPTER_OBJECT_TYPE,

					objectId:
						chapterId,

					publisher,

					resourceId:
						CHAPTER_RESOURCE_ID,

					modifiedAt:
						200
				});

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						strongsStoredId
					)
				).toEqual({
					id:
						strongsStoredId,

					objectType:
						STRONGS_DEFINITION_OBJECT_TYPE,

					objectId:
						strongsId,

					publisher,

					resourceId:
						STRONGS_RESOURCE_ID,

					modifiedAt:
						201
				});

				expect(
					await db.get(
						RESOURCE_RECEIPTS,
						createResourceReceiptId(
							publisher,
							CHAPTER_RESOURCE_ID
						)
					)
				).toEqual({
					id:
						createResourceReceiptId(
							publisher,
							CHAPTER_RESOURCE_ID
						),

					publisher,

					resourceId:
						CHAPTER_RESOURCE_ID,

					modifiedAt:
						200
				});

				expect(
					await db.get(
						RESOURCE_RECEIPTS,
						createResourceReceiptId(
							publisher,
							STRONGS_RESOURCE_ID
						)
					)
				).toEqual({
					id:
						createResourceReceiptId(
							publisher,
							STRONGS_RESOURCE_ID
						),

					publisher,

					resourceId:
						STRONGS_RESOURCE_ID,

					modifiedAt:
						201
				});
			}
		);
	}
);

function createChapterContent() {
	return {
		number:
			1,

		bookName:
			'Genesis',

		verses: {},

		verseMap: {},

		footnotes: {}
	};
}

function createStrongsContent() {
	return {
		number:
			'G1',

		originalWord:
			'Α',

		partsOfSpeech:
			'noun',

		phoneticSpelling:
			'word',

		transliteratedWord:
			'word',

		usageByBook: [],

		usageByWord: [],

		brownDef:
			null,

		strongsDef:
			'definition',

		thayersDef:
			null
	};
}

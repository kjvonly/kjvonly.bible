import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference,
	ResourceRepresentation,
	ResourceRepresentationType,
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
	BibleChapterInterpreter
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
	BibleChapterValidator
} from '$lib/domains/bible/resources/chapters/bible-chapter-validator';

import {
	BibleChapterInstaller,
	BIBLE_CHAPTER_OBJECT_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-installer';

import {
	BibleChapterResourceHandler
} from '$lib/domains/bible/resources/chapters/bible-chapter-resource-handler';

import {
	BibleChapterResourceService
} from '$lib/domains/bible/resources/chapters/bible-chapter-resource-service';

import {
	IndexedDBBibleChapterInstallationTransaction
} from '$lib/domains/bible/persistence/bible-chapter-installation-transaction';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	createBibleVersionId,
	createChapterId
} from '$lib/domains/bible/utils/bible-identity';

import {
	createResourceInstallationId
} from '$lib/resource/installation/resource-installation';

const BIBLE_VERSION_OBJECT_TYPE =
	'bible/version';

describe(
	'Bible Chapter Resource installation',
	() => {
		it(
			'decodes validates and installs a Chapter bundle into IndexedDB',
			async () => {
				const publisher =
					createPublisher();

				const resourceId =
					'kjvonly/bible/chapters/kjvs';

				const eventId =
					'a'.repeat(
						64
					);

				const service =
					createService([
						createVerifiedContent({
							publisher,
							resourceId,
							eventId,

							content:
								JSON.stringify({
									'kjvs/1_1':
										createChapterContent(
											1
										),

									'kjvs/1_2':
										createChapterContent(
											2
										)
								})
						})
					]);

				const result =
					await service.install({
						publisher,
						resourceId
					});

				expect(
					result
				).toBe(
					true
				);

				const chapter1Id =
					createChapterId(
						createBibleVersionId(
							publisher,
							'kjvs'
						),
						'1_1'
					);

				const chapter2Id =
					createChapterId(
						createBibleVersionId(
							publisher,
							'kjvs'
						),
						'1_2'
					);

				expect(
					await getDomainObject(
						BIBLE_CHAPTER_OBJECT_TYPE,
						chapter1Id
					)
				).toEqual({
					id:
						chapter1Id,

					...createChapterContent(
						1
					)
				});

				expect(
					await getDomainObject(
						BIBLE_CHAPTER_OBJECT_TYPE,
						chapter2Id
					)
				).toEqual({
					id:
						chapter2Id,

					...createChapterContent(
						2
					)
				});

				const bibleVersionId =
					createBibleVersionId(
						publisher,
						'kjvs'
					);

				expect(
					await getDomainObject(
						BIBLE_VERSION_OBJECT_TYPE,
						bibleVersionId
					)
				).toEqual({
					id:
						bibleVersionId,

					publisher,

					version:
						'kjvs'
				});

				const installationId =
					createResourceInstallationId(
						BIBLE_CHAPTER_OBJECT_TYPE,
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
						BIBLE_CHAPTER_OBJECT_TYPE,

					objectId:
						chapter1Id,

					publisher,

					resourceId,

					eventId,

					modifiedAt:
						200
				});
			}
		);

		it(
			'installs nothing when one Chapter in a bundle fails validation',
			async () => {
				const publisher =
					createPublisher();

				const resourceId =
					'kjvonly/bible/chapters/kjvs';

				const service =
					createService([
						createVerifiedContent({
							publisher,
							resourceId,

							content:
								JSON.stringify({
									'kjvs/1_1':
										createChapterContent(
											1
										),

									'kjvs/1_2': {
										...createChapterContent(
											2
										),

										bookName:
											''
									}
								})
						})
					]);

				await expect(
					service.install({
						publisher,
						resourceId
					})
				).rejects.toThrow();

				const chapter1Id =
					createChapterId(
						createBibleVersionId(
							publisher,
							'kjvs'
						),
						'1_1'
					);

				const chapter2Id =
					createChapterId(
						createBibleVersionId(
							publisher,
							'kjvs'
						),
						'1_2'
					);

				expect(
					await getDomainObject(
						BIBLE_CHAPTER_OBJECT_TYPE,
						chapter1Id
					)
				).toBeUndefined();

				expect(
					await getDomainObject(
						BIBLE_CHAPTER_OBJECT_TYPE,
						chapter2Id
					)
				).toBeUndefined();

				expect(
					await getDomainObject(
						BIBLE_VERSION_OBJECT_TYPE,
						createBibleVersionId(
							publisher,
							'kjvs'
						)
					)
				).toBeUndefined();

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							BIBLE_CHAPTER_OBJECT_TYPE,
							chapter1Id
						)
					)
				).toBeUndefined();
			}
		);

		it(
			'commits each resolved descriptor independently',
			async () => {
				const publisher =
					createPublisher();

				const chapter1ResourceId =
					'kjvonly/bible/chapters/kjvs/1_1';

				const chapter2ResourceId =
					'kjvonly/bible/chapters/kjvs/1_2';

				const eventA =
					'a'.repeat(
						64
					);

				const eventB =
					'b'.repeat(
						64
					);

				const service =
					createService(
						[
							createVerifiedContent({
								publisher,

								resourceId:
									chapter1ResourceId,

								eventId:
									eventA,

								modifiedAt:
									100,

								content:
									JSON.stringify(
										createChapterContent(
											1
										)
									)
							}),

							createVerifiedContent({
								publisher,

								resourceId:
									chapter2ResourceId,

								eventId:
									eventB,

								modifiedAt:
									200,

								content:
									JSON.stringify({
										...createChapterContent(
											2
										),

										bookName:
											''
									})
							})
						],
						'descriptors'
					);

				await expect(
					service.install({
						publisher,

						resourceId:
							'kjvonly/bible/chapters/kjvs'
					})
				).rejects.toThrow();

				const chapter1Id =
					createChapterId(
						createBibleVersionId(
							publisher,
							'kjvs'
						),
						'1_1'
					);

				const chapter2Id =
					createChapterId(
						createBibleVersionId(
							publisher,
							'kjvs'
						),
						'1_2'
					);

				/*
				 * Descriptor A completed its own
				 * installation transaction.
				 */
				expect(
					await getDomainObject(
						BIBLE_CHAPTER_OBJECT_TYPE,
						chapter1Id
					)
				).toEqual({
					id:
						chapter1Id,

					...createChapterContent(
						1
					)
				});

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							BIBLE_CHAPTER_OBJECT_TYPE,
							chapter1Id
						)
					)
				).toMatchObject({
					objectId:
						chapter1Id,

					eventId:
						eventA,

					modifiedAt:
						100
				});

				/*
				 * Descriptor B failed validation,
				 * so its transaction never began.
				 */
				expect(
					await getDomainObject(
						BIBLE_CHAPTER_OBJECT_TYPE,
						chapter2Id
					)
				).toBeUndefined();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						createResourceInstallationId(
							BIBLE_CHAPTER_OBJECT_TYPE,
							chapter2Id
						)
					)
				).toBeUndefined();
			}
		);
	}
);

function createService(
	contents:
		readonly VerifiedResourceContent[],

	representation:
		ResourceRepresentationType =
		'content'
): BibleChapterResourceService {

	const discovery =
		new FakeDiscovery(
			createRepresentation(
				representation
			)
		);

	const resolver =
		new FakeResolver(
			contents
		);

	const decoder =
		createDecoder();

	const installationTransaction =
		new IndexedDBBibleChapterInstallationTransaction(
			getApplicationDB
		);

	const installer =
		new BibleChapterInstaller(
			installationTransaction
		);

	const handler =
		new BibleChapterResourceHandler(
			new BibleChapterInterpreter(),
			new BibleChapterValidator(),
			installer
		);

	return new BibleChapterResourceService(
		discovery,
		resolver,
		decoder,
		handler
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
			'kjvonly/bible/chapters/kjvs',

		resourceType:
			'kjvonly/bible/chapters',

		eventId:
			'a'.repeat(
				64
			),

		modifiedAt:
			200,

		mediaType:
			'application/json',

		content:
			'{}',

		...overrides
	};
}

function createRepresentation(
	representation:
		ResourceRepresentationType
): ResourceRepresentation {

	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/bible/chapters/kjvs',

		resourceType:
			'kjvonly/bible/chapters',

		eventId:
			'c'.repeat(
				64
			),

		modifiedAt:
			200,

		representation,

		mediaType:
			'application/json',

		payload:
			'{}'
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
	) { }

	async resolve(
		_resource:
			ResourceRepresentation
	): Promise<
		readonly VerifiedResourceContent[]
	> {
		return this.contents;
	}
}
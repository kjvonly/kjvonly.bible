import {
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference,
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import {
	ResourceWorkerClient
} from '$lib/resource/worker/resource-worker-client';

import {
	BIBLE_CHAPTER_OBJECT_TYPE
} from '$lib/domains/bible/resources/chapters/bible-chapter-installer';

import {
	createBibleVersionId,
	createChapterId
} from '$lib/domains/bible/utils/bible-identity';

import {
	createResourceInstallationId
} from '$lib/resource/installation/resource-installation';

import {
	createResourceReceiptId
} from '$lib/resource/receipts/resource-receipt';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

describe(
	'Resource Worker installation',
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
			'installs a Resource through a real browser Worker',
			async () => {
				const publisher =
					createPublisher();

				const resourceId =
					'kjvonly/bible/chapters/kjvs';

				const reference:
					PublishedResourceReference = {
					publisher,
					resourceId
				};

				const representation:
					ResourceRepresentation = {
					publisher,

					resourceId,

					resourceType:
						'kjvonly/bible/chapters',

					eventId:
						'a'.repeat(
							64
						),

					modifiedAt:
						100,

					representation:
						'content',

					mediaType:
						'application/json',

					payload:
						JSON.stringify({
							'kjvs/1_1':
								createChapterContent(
									1
								)
						})
				};

				const discovery =
					new FakeDiscovery(
						representation
					);

				const worker =
					new Worker(
						new URL(
							'../../src/lib/resource/worker/resource.worker.ts',
							import.meta.url
						),
						{
							type:
								'module'
						}
					);

				const client =
					new ResourceWorkerClient(
						worker,
						discovery
					);

				try {
					const result =
						await client.install(
							reference
						);

					expect(
						result
					).toEqual({
						requested:
							reference,

						found:
							true,

						resources: [
							{
								reference,

								resourceType:
									'kjvonly/bible/chapters',

								status:
									'handled'
							}
						]
					});

					expect(
						discovery.references
					).toEqual([
						reference
					]);

					const bibleVersionId =
						createBibleVersionId(
							publisher,
							'kjvs'
						);

					const chapterId =
						createChapterId(
							bibleVersionId,
							'1_1',
						);

					const db =
						await getApplicationDB();

					expect(
						await db.get(
							DOMAIN_OBJECTS,
							createStoredDomainObjectId(
								BIBLE_CHAPTER_OBJECT_TYPE,
								chapterId
							)
						)
					).toEqual({
						id:
							createStoredDomainObjectId(
								BIBLE_CHAPTER_OBJECT_TYPE,
								chapterId
							),

						objectType:
							BIBLE_CHAPTER_OBJECT_TYPE,

						objectId:
							chapterId,

						value: {
							id:
								chapterId,

							...createChapterContent(
								1
							)
						}
					});

					expect(
						await db.get(
							RESOURCE_INSTALLATIONS,
							createResourceInstallationId(
								BIBLE_CHAPTER_OBJECT_TYPE,
								chapterId
							)
						)
					).toMatchObject({
						objectId:
							chapterId,

						publisher,

						resourceId,

						modifiedAt:
							100
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
							100
					});
				} finally {
					client.dispose();
				}
			}
		);
	}
);

function createChapterContent(
	number:
		number
) {
	return {
		number,

		bookName:
			'Genesis',

		verses:
			{},

		verseMap:
			{},

		footnotes:
			{}
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

	readonly references:
		PublishedResourceReference[] =
			[];

	constructor(
		private readonly representation:
			ResourceRepresentation |
			null
	) {}

	async get(
		reference:
			PublishedResourceReference
	): Promise<
		ResourceRepresentation |
		null
	> {

		this.references.push(
			reference
		);

		return this.representation;
	}
}
import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	Chapter
} from '$lib/domains/bible/models/bible.model';

import type {
	BibleVersion
} from '$lib/domains/bible/models/bible-version.model';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceInstallation
} from '$lib/resource/installation/resource-installation';

import {
	createResourceInstallationId
} from '$lib/resource/installation/resource-installation';

import type {
	BibleChapterInstallationStores,
	BibleChapterInstallationTransaction
} from './bible-chapter-installation-stores';

import {
	BIBLE_CHAPTER_OBJECT_TYPE,
	BibleChapterInstaller
} from './bible-chapter-installer';

import type {
	ValidatedBibleChapterCandidate
} from './validated-bible-chapter-candidate';

describe(
	'BibleChapterInstaller',
	() => {
		it(
			'installs a new Chapter',
			async () => {
				const transaction =
					new FakeBibleChapterInstallationTransaction();

				const installer =
					new BibleChapterInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[
						createCandidate()
					]
				);

				expect(
					transaction.chapters.get(
						'publisher/kjvs/1_1'
					)
				).toEqual({
					id:
						'publisher/kjvs/1_1',

					number:
						1,

					bookName:
						'Genesis',

					verses: {},

					verseMap: {},

					footnotes: {}
				});
			}
		);

		it(
			'creates the Bible Version when missing',
			async () => {
				const transaction =
					new FakeBibleChapterInstallationTransaction();

				const installer =
					new BibleChapterInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[
						createCandidate()
					]
				);

				expect(
					transaction.bibleVersions.get(
						'publisher/kjvs'
					)
				).toEqual({
					id:
						'publisher/kjvs',

					publisher:
						'publisher',

					version:
						'kjvs'
				});
			}
		);

		it(
			'does not replace an existing Bible Version',
			async () => {
				const transaction =
					new FakeBibleChapterInstallationTransaction();

				const existingVersion:
					BibleVersion = {
						id:
							'publisher/kjvs',

						publisher:
							'publisher',

						version:
							'kjvs'
					};

				transaction.bibleVersions.set(
					existingVersion.id,
					existingVersion
				);

				const installer =
					new BibleChapterInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[
						createCandidate()
					]
				);

				expect(
					transaction.bibleVersionPutCount
				).toBe(
					0
				);
			}
		);

		it(
			'creates Resource Installation provenance',
			async () => {
				const transaction =
					new FakeBibleChapterInstallationTransaction();

				const installer =
					new BibleChapterInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[
						createCandidate()
					]
				);

				const chapterId =
					'publisher/kjvs/1_1';

				const installationId =
					createResourceInstallationId(
						BIBLE_CHAPTER_OBJECT_TYPE,
						chapterId
					);

				expect(
					transaction.resourceInstallations.get(
						installationId
					)
				).toEqual({
					id:
						installationId,

					objectType:
						BIBLE_CHAPTER_OBJECT_TYPE,

					objectId:
						chapterId,

					publisher:
						'publisher',

					resourceId:
						'kjvonly/bible/chapters/kjvs',

					modifiedAt:
						200
				});
			}
		);

		it(
			'replaces a Chapter when the incoming Resource is newer',
			async () => {
				const transaction =
					new FakeBibleChapterInstallationTransaction();

				seedInstalledChapter(
					transaction,
					{
						modifiedAt:
							100,

						bookName:
							'Old Genesis'
					}
				);

				const installer =
					new BibleChapterInstaller(
						transaction
					);

				await installer.install(
					createResource({
						modifiedAt:
							200
					}),
					[
						createCandidate()
					]
				);

				expect(
					transaction.chapters.get(
						'publisher/kjvs/1_1'
					)?.bookName
				).toBe(
					'Genesis'
				);

				expect(
					getInstallation(
						transaction,
						'publisher/kjvs/1_1'
					)?.modifiedAt
				).toBe(
					200
				);
			}
		);

		it(
			'skips a Chapter when the installed Resource is newer',
			async () => {
				const transaction =
					new FakeBibleChapterInstallationTransaction();

				seedInstalledChapter(
					transaction,
					{
						modifiedAt:
							300,

						bookName:
							'Newer Genesis'
					}
				);

				const installer =
					new BibleChapterInstaller(
						transaction
					);

				await installer.install(
					createResource({
						modifiedAt:
							200
					}),
					[
						createCandidate()
					]
				);

				expect(
					transaction.chapters.get(
						'publisher/kjvs/1_1'
					)?.bookName
				).toBe(
					'Newer Genesis'
				);

				expect(
					getInstallation(
						transaction,
						'publisher/kjvs/1_1'
					)?.modifiedAt
				).toBe(
					300
				);
			}
		);

		it(
			'skips a Chapter when modifiedAt is equal',
			async () => {
				const transaction =
					new FakeBibleChapterInstallationTransaction();

				seedInstalledChapter(
					transaction,
					{
						modifiedAt:
							200,

						bookName:
							'Existing Genesis'
					}
				);

				const installer =
					new BibleChapterInstaller(
						transaction
					);

				await installer.install(
					createResource({
						modifiedAt:
							200
					}),
					[
						createCandidate()
					]
				);

				expect(
					transaction.chapters.get(
						'publisher/kjvs/1_1'
					)?.bookName
				).toBe(
					'Existing Genesis'
				);
			}
		);

		it(
			'installs and skips individual Chapters independently within a bundle',
			async () => {
				const transaction =
					new FakeBibleChapterInstallationTransaction();

				seedInstalledChapter(
					transaction,
					{
						chapterRef:
							'1_1',

						chapterNumber:
							1,

						modifiedAt:
							300,

						bookName:
							'Newer Genesis 1'
					}
				);

				seedInstalledChapter(
					transaction,
					{
						chapterRef:
							'1_2',

						chapterNumber:
							2,

						modifiedAt:
							100,

						bookName:
							'Old Genesis 2'
					}
				);

				const installer =
					new BibleChapterInstaller(
						transaction
					);

				await installer.install(
					createResource({
						modifiedAt:
							200
					}),
					[
						createCandidate({
							chapterRef:
								'1_1',

							content:
								createChapterContent({
									number:
										1,

									bookName:
										'Bundle Genesis 1'
								})
						}),
						createCandidate({
							chapterRef:
								'1_2',

							content:
								createChapterContent({
									number:
										2,

									bookName:
										'Bundle Genesis 2'
								})
						})
					]
				);

				expect(
					transaction.chapters.get(
						'publisher/kjvs/1_1'
					)?.bookName
				).toBe(
					'Newer Genesis 1'
				);

				expect(
					transaction.chapters.get(
						'publisher/kjvs/1_2'
					)?.bookName
				).toBe(
					'Bundle Genesis 2'
				);

				expect(
					getInstallation(
						transaction,
						'publisher/kjvs/1_1'
					)?.modifiedAt
				).toBe(
					300
				);

				expect(
					getInstallation(
						transaction,
						'publisher/kjvs/1_2'
					)?.modifiedAt
				).toBe(
					200
				);
			}
		);

		it(
			'uses one transaction for the entire Resource',
			async () => {
				const transaction =
					new FakeBibleChapterInstallationTransaction();

				const installer =
					new BibleChapterInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[
						createCandidate({
							chapterRef:
								'1_1'
						}),
						createCandidate({
							chapterRef:
								'1_2',

							content:
								createChapterContent({
									number:
										2
								})
						}),
						createCandidate({
							chapterRef:
								'1_3',

							content:
								createChapterContent({
									number:
										3
								})
						})
					]
				);

				expect(
					transaction.runCount
				).toBe(
					1
				);
			}
		);

		it(
			'does nothing for an empty candidate collection',
			async () => {
				const transaction =
					new FakeBibleChapterInstallationTransaction();

				const installer =
					new BibleChapterInstaller(
						transaction
					);

				await installer.install(
					createResource(),
					[]
				);

				expect(
					transaction.runCount
				).toBe(
					0
				);

				expect(
					transaction.chapters.size
				).toBe(
					0
				);

				expect(
					transaction.bibleVersions.size
				).toBe(
					0
				);

				expect(
					transaction.resourceInstallations.size
				).toBe(
					0
				);
			}
		);

		it(
			'rejects candidates from multiple Bible versions before starting the transaction',
			async () => {
				const transaction =
					new FakeBibleChapterInstallationTransaction();

				const installer =
					new BibleChapterInstaller(
						transaction
					);

				await expect(
					installer.install(
						createResource(),
						[
							createCandidate({
								version:
									'kjvs'
							}),
							createCandidate({
								version:
									'kjv'
							})
						]
					)
				).rejects.toThrow(
					'Bible Chapter Resource contains multiple Bible versions.'
				);

				expect(
					transaction.runCount
				).toBe(
					0
				);
			}
		);
	}
);

function createResource(
	overrides:
		Partial<DecodedResourceContent> =
			{}
): DecodedResourceContent {
	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/bible/chapters/kjvs',

		resourceType:
			'kjvonly/bible/chapters',

		eventId:
			'event-200',

		modifiedAt:
			200,

		mediaType:
			'application/json',

		value: {},

		...overrides
	};
}

function createCandidate(
	overrides:
		Partial<ValidatedBibleChapterCandidate> =
			{}
): ValidatedBibleChapterCandidate {
	return {
		version:
			'kjvs',

		chapterRef:
			'1_1',

		content:
			createChapterContent(),

		...overrides
	};
}

function createChapterContent(
	overrides:
		Record<string, unknown> =
			{}
) {
	return {
		number:
			1,

		bookName:
			'Genesis',

		verses: {},

		verseMap: {},

		footnotes: {},

		...overrides
	};
}

function seedInstalledChapter(
	transaction:
		FakeBibleChapterInstallationTransaction,

	options: {
		chapterRef?: string;
		chapterNumber?: number;
		modifiedAt: number;
		bookName: string;
	}
): void {
	const chapterRef =
		options.chapterRef ??
		'1_1';

	const chapterNumber =
		options.chapterNumber ??
		1;

	const chapterId =
		`publisher/kjvs/${chapterRef}`;

	const chapter:
		Chapter = {
			id:
				chapterId,

			number:
				chapterNumber,

			bookName:
				options.bookName,

			verses: {},

			verseMap: {},

			footnotes: {}
		};

	transaction.chapters.set(
		chapterId,
		chapter
	);

	const installation:
		ResourceInstallation = {
			id:
				createResourceInstallationId(
					BIBLE_CHAPTER_OBJECT_TYPE,
					chapterId
				),

			objectType:
				BIBLE_CHAPTER_OBJECT_TYPE,

			objectId:
				chapterId,

			publisher:
				'publisher',

			resourceId:
				'kjvonly/bible/chapters/kjvs',

			modifiedAt:
				options.modifiedAt
		};

	transaction.resourceInstallations.set(
		installation.id,
		installation
	);
}

function getInstallation(
	transaction:
		FakeBibleChapterInstallationTransaction,

	chapterId:
		string
): ResourceInstallation | undefined {
	return transaction
		.resourceInstallations
		.get(
			createResourceInstallationId(
				BIBLE_CHAPTER_OBJECT_TYPE,
				chapterId
			)
		);
}

class FakeBibleChapterInstallationTransaction
	implements BibleChapterInstallationTransaction {

	runCount =
		0;

	bibleVersionPutCount =
		0;

	readonly chapters =
		new Map<
			string,
			Chapter
		>();

	readonly bibleVersions =
		new Map<
			string,
			BibleVersion
		>();

	readonly resourceInstallations =
		new Map<
			string,
			ResourceInstallation
		>();

	async run<TResult>(
		operation:
			(
				stores:
					BibleChapterInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		this.runCount++;

		const stores:
			BibleChapterInstallationStores = {
				chapters: {
					get:
						async (
							id
						) =>
							this.chapters.get(
								id
							),

					put:
						async (
							chapter
						) => {
							this.chapters.set(
								chapter.id,
								chapter
							);
						}
				},

				bibleVersions: {
					get:
						async (
							id
						) =>
							this.bibleVersions.get(
								id
							),

					put:
						async (
							bibleVersion
						) => {
							this.bibleVersionPutCount++;

							this.bibleVersions.set(
								bibleVersion.id,
								bibleVersion
							);
						}
				},

				resourceInstallations: {
					get:
						async (
							objectType,
							objectId
						) => {
							return this
								.resourceInstallations
								.get(
									createResourceInstallationId(
										objectType,
										objectId
									)
								);
						},

					put:
						async (
							installation
						) => {
							this.resourceInstallations.set(
								installation.id,
								installation
							);
						}
				}
			};

		return operation(
			stores
		);
	}
}
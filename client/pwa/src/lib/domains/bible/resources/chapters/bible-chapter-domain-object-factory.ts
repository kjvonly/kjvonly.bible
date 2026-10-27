import type {
	BibleVersion
} from '../../models/bible-version.model';

import type {
	Chapter,
	ChapterContent
} from '../../models/bible.model';

import {
	BIBLE_CHAPTER_OBJECT_TYPE
} from '../../persistence/chapter-store';

import {
	BIBLE_VERSION_DATA_TYPE,
	BIBLE_VERSION_OBJECT_TYPE
} from '../../persistence/bible-version-store';

import {
	createBibleVersionId,
	createChapterId
} from '../../utils/bible-identity';

import {
	type ResourceDomainObjectCandidate,
	type ResourceDomainObjectFactory,
	type ResourceDomainObjectFactoryContext
} from '$lib/resource';

import {
	isBibleChapterContent,
	type BibleChapterResourceData
} from './bible-chapter-data-type-handler';

import {
	BIBLE_CHAPTER_DATA_TYPE,
	BIBLE_CHAPTER_DATA_VERSION,
	BIBLE_CHAPTER_RESOURCE_TYPE,
	BIBLE_CHAPTER_VERSION_METADATA_KEY,
	parseBibleChapterResourceId
} from './bible-chapter-resource';

import {
	validateBibleChapterInvariants
} from './bible-chapter-validation';

/**
 * Converts validated Bible Chapter Resource values into canonical Bible Domain
 * objects.
 *
 * `bibleId` is an identity namespace derived from the Resource ID. It is
 * deliberately independent from `metadata.version`, which is only the semantic
 * Bible version label. Two different Resource IDs may therefore publish
 * the same version label, and a Resource ID is not required to match that
 * label.
 *
 * The supporting `bible/version` object is emitted through the same generic
 * Resource lifecycle as Chapter objects. It therefore follows the same normal
 * Resource currentness and provenance rules rather than requiring a special
 * installation policy.
 */
export class BibleChapterDomainObjectFactory
	implements ResourceDomainObjectFactory {

	readonly resourceType =
		BIBLE_CHAPTER_RESOURCE_TYPE;

	create(
		resource:
			ResourceDomainObjectFactoryContext,

		value: unknown
	): readonly ResourceDomainObjectCandidate[] {
		const identity =
			parseBibleChapterResourceId(
				resource.resourceId
			);

		const version =
			resource.metadata?.[
				BIBLE_CHAPTER_VERSION_METADATA_KEY
			];

		if (
			version === undefined ||
			version.trim().length === 0
		) {
			throw new Error(
				'Bible Chapter Resource metadata requires a non-empty version.'
			);
		}

		const accepted =
			value as BibleChapterResourceData;

		let bibleId:
			string;

		let chapters:
			readonly ChapterCandidate[];

		if (
			identity.chapterRef !==
				undefined
		) {
			bibleId =
				identity.bibleId;

			const chapterRef =
				identity.chapterRef;

			if (
				!isBibleChapterContent(
					accepted
				)
			) {
				throw new Error(
					'Bible Chapter individual Resource requires one Chapter payload.'
				);
			}

			chapters = [
				this.createChapterCandidate(
					chapterRef,
					accepted
				)
			];
		} else {
			bibleId =
				identity.bibleId;

			if (
				typeof accepted !==
					'object' ||
				accepted ===
					null ||
				Array.isArray(
					accepted
				) ||
				isBibleChapterContent(
					accepted
				)
			) {
				throw new Error(
					'Bible Chapter bundle content must be an object.'
				);
			}

			chapters =
				Object.entries(
					accepted
				).map(
					([entryRef, content]) =>
						this.createBundleChapterCandidate(
							bibleId,
							entryRef,
							content
						)
				);
		}

		if (!bibleId) {
			throw new Error(
				'Bible Chapter Resource requires a non-empty bibleId.'
			);
		}

		if (
			chapters.length ===
				0
		) {
			return [];
		}

		const bibleVersionId =
			createBibleVersionId(
				resource.publisher,
				bibleId
			);

		const bibleVersion:
			BibleVersion = {
				id:
					bibleVersionId,

				publisher:
					resource.publisher,

				version
			};

		return [
			{
				objectType:
					BIBLE_VERSION_OBJECT_TYPE,


				objectId:
					bibleVersionId,

				dataType:
					BIBLE_VERSION_DATA_TYPE,

				dataVersion:
					1,

				value:
					bibleVersion
			},

			...chapters.map(
				({
					chapterRef,
					content
				}) => {
					const chapterId =
						createChapterId(
							bibleVersionId,
							chapterRef
						);

					const chapter:
						Chapter = {
							...content,
							id:
								chapterId
						};

					return {
						objectType:
							BIBLE_CHAPTER_OBJECT_TYPE,


						objectId:
							chapterId,

						dataType:
							BIBLE_CHAPTER_DATA_TYPE,

						dataVersion:
							BIBLE_CHAPTER_DATA_VERSION,

						value:
							chapter
					};
				}
			)
		];
	}

	private createBundleChapterCandidate(
		bibleId: string,
		entryRef: string,
		content: ChapterContent
	): ChapterCandidate {
		const segments =
			entryRef.split('/');

		if (
			segments.length !==
				2
		) {
			throw new Error(
				`Invalid Bible Chapter bundle entry: ${entryRef}`
			);
		}

		const [
			entryBibleId,
			chapterRef
		] = segments;

		if (
			!entryBibleId ||
			!chapterRef
		) {
			throw new Error(
				`Invalid Bible Chapter bundle entry: ${entryRef}`
			);
		}

		if (
			entryBibleId !==
				bibleId
		) {
			throw new Error(
				`Bible Chapter bundle entry bibleId does not match Resource bibleId: ${entryRef}`
			);
		}

		return this.createChapterCandidate(
			chapterRef,
			content
		);
	}

	private createChapterCandidate(
		chapterRef: string,
		content: ChapterContent
	): ChapterCandidate {
		validateBibleChapterInvariants(
			chapterRef,
			content
		);

		return {
			chapterRef,
			content
		};
	}
}

interface ChapterCandidate {
	readonly chapterRef:
		string;

	readonly content:
		ChapterContent;
}

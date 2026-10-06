import {
	createBibleResourceId,
	parseBibleResourceId
} from '../bible-resource-id';

/** Application type represented by Bible Chapter Resources. */
export const BIBLE_CHAPTER_RESOURCE_TYPE =
	'bible/chapter';

/** Semantic contract for one Bible Chapter payload. */
export const BIBLE_CHAPTER_DATA_TYPE =
	'kjvonly.bible.chapter';

/** Current semantic version of the Bible Chapter payload contract. */
export const BIBLE_CHAPTER_DATA_VERSION =
	1;

/** Domain-specific Resource metadata key carrying the semantic Bible version. */
export const BIBLE_CHAPTER_VERSION_METADATA_KEY =
	'version';

export interface BibleChapterResourceIdentity {
	readonly bibleId: string;
	readonly chapterRef?: string;
}

export function createBibleChapterResourceId(
	bibleId: string,
	chapterRef?: string
): string {
	return createBibleResourceId(
		'chapter',
		bibleId,
		...(chapterRef === undefined
			? []
			: [chapterRef])
	);
}

export function parseBibleChapterResourceId(
	resourceId: string
): BibleChapterResourceIdentity {
	const [
		bibleId,
		chapterRef
	] = parseBibleResourceId(
		resourceId,
		'chapter',
		[1, 2],
		'Chapter'
	);

	return {
		bibleId,
		...(chapterRef === undefined
			? {}
			: { chapterRef })
	};
}

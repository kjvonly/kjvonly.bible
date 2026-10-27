import {
	createBibleResourceId,
	parseBibleResourceId
} from '../bible-resource-id';

/** Application type represented by Bible Paragraphs Resources. */
export const BIBLE_PARAGRAPHS_RESOURCE_TYPE =
	'bible/paragraphs';

/** Semantic contract for Bible paragraph-overlay payloads. */
export const BIBLE_PARAGRAPHS_DATA_TYPE =
	'kjvonly.bible.paragraphs';

/** Current semantic version of the Bible Paragraphs payload contract. */
export const BIBLE_PARAGRAPHS_DATA_VERSION =
	1;

export interface BibleParagraphsResourceIdentity {
	readonly source: string;
	readonly chapterRef?: string;
}

export function createBibleParagraphsResourceId(
	source: string,
	chapterRef?: string
): string {
	return createBibleResourceId(
		'paragraphs',
		source,
		...(chapterRef === undefined
			? []
			: [chapterRef])
	);
}

export function parseBibleParagraphsResourceId(
	resourceId: string
): BibleParagraphsResourceIdentity {
	const [
		source,
		chapterRef
	] = parseBibleResourceId(
		resourceId,
		'paragraphs',
		[1, 2],
		'Paragraphs'
	);

	return {
		source,
		...(chapterRef === undefined
			? {}
			: { chapterRef })
	};
}

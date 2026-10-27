import {
	createBibleResourceId,
	parseBibleResourceId
} from '../bible-resource-id';

/** Application type represented by Bible Text Markup Resources. */
export const BIBLE_TEXT_MARKUP_RESOURCE_TYPE =
	'bible/text-markup';

/** Semantic payload contract for Bible Text Markup data. */
export const BIBLE_TEXT_MARKUP_DATA_TYPE =
	'kjvonly.bible.text-markup';

/** Current semantic version of the Bible Text Markup payload contract. */
export const BIBLE_TEXT_MARKUP_DATA_VERSION =
	1;

export interface BibleTextMarkupResourceIdentity {
	readonly name: string;
	readonly chapterRef?: string;
}

export function createBibleTextMarkupResourceId(
	name: string,
	chapterRef?: string
): string {
	return createBibleResourceId(
		'text-markup',
		name,
		...(chapterRef === undefined
			? []
			: [chapterRef])
	);
}

export function parseBibleTextMarkupResourceId(
	resourceId: string
): BibleTextMarkupResourceIdentity {
	const [
		name,
		chapterRef
	] = parseBibleResourceId(
		resourceId,
		'text-markup',
		[1, 2],
		'Text Markup'
	);

	return {
		name,
		...(chapterRef === undefined
			? {}
			: { chapterRef })
	};
}

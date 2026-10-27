import {
	createBibleResourceId,
	parseBibleResourceId
} from '../bible-resource-id';

/** Application type represented by Bible Pericopes Resources. */
export const BIBLE_PERICOPES_RESOURCE_TYPE =
	'bible/pericopes';

/** Semantic contract for Bible pericope-overlay payloads. */
export const BIBLE_PERICOPES_DATA_TYPE =
	'kjvonly.bible.pericopes';

/** Current semantic version of the Bible Pericopes payload contract. */
export const BIBLE_PERICOPES_DATA_VERSION =
	1;

export interface BiblePericopesResourceIdentity {
	readonly source: string;
	readonly chapterRef?: string;
}

export function createBiblePericopesResourceId(
	source: string,
	chapterRef?: string
): string {
	return createBibleResourceId(
		'pericopes',
		source,
		...(chapterRef === undefined
			? []
			: [chapterRef])
	);
}

export function parseBiblePericopesResourceId(
	resourceId: string
): BiblePericopesResourceIdentity {
	const [
		source,
		chapterRef
	] = parseBibleResourceId(
		resourceId,
		'pericopes',
		[1, 2],
		'Pericopes'
	);

	return {
		source,
		...(chapterRef === undefined
			? {}
			: { chapterRef })
	};
}

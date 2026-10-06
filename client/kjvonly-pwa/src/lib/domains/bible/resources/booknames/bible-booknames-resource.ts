import {
	createBibleResourceId,
	parseBibleResourceId
} from '../bible-resource-id';

/** Application type represented by Bible Booknames Resources. */
export const BIBLE_BOOKNAMES_RESOURCE_TYPE =
	'bible/booknames';

/** Semantic contract for Bible book-name metadata payloads. */
export const BIBLE_BOOKNAMES_DATA_TYPE =
	'kjvonly.bible.booknames';

/** Current semantic version of the Bible book-name metadata contract. */
export const BIBLE_BOOKNAMES_DATA_VERSION =
	1;

export function createBibleBooknamesResourceId(
	key: string
): string {
	return createBibleResourceId(
		'booknames',
		key
	);
}

export function parseBibleBooknamesResourceId(
	resourceId: string
): string {
	return parseBibleResourceId(
		resourceId,
		'booknames',
		[1],
		'Booknames'
	)[0];
}

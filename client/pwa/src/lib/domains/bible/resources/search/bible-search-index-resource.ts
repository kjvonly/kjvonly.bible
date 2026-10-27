import {
	createBibleResourceId,
	parseBibleResourceId
} from '../bible-resource-id';

/** Application type represented by Bible Search Index Resources. */
export const BIBLE_SEARCH_RESOURCE_TYPE =
	'bible/search-index';

/** Semantic payload contract for Bible search-index data. */
export const BIBLE_SEARCH_INDEX_DATA_TYPE =
	'kjvonly.bible.search-index';

/** Current semantic version of the Bible search-index payload contract. */
export const BIBLE_SEARCH_INDEX_DATA_VERSION =
	1;

export function createBibleSearchIndexResourceId(
	version: string
): string {
	return createBibleResourceId(
		'search-index',
		version
	);
}

export function parseBibleSearchIndexResourceId(
	resourceId: string
): string {
	return parseBibleResourceId(
		resourceId,
		'search-index',
		[1],
		'Search Index'
	)[0];
}

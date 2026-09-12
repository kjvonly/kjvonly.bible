import type {
	BibleSearchIndex
} from '$lib/domains/bible/models/bible-search-index.model';

export const BIBLE_SEARCH_INDEX_OBJECT_TYPE =
	'bible/search-index';

export interface BibleSearchIndexStore {
	get(
		id: string
	): Promise<
		BibleSearchIndex |
		undefined
	>;

	put(
		searchIndex:
			BibleSearchIndex
	): Promise<void>;
}

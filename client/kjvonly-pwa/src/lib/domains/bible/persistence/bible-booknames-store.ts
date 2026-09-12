import type {
	BibleBooknames
} from '$lib/domains/bible/models/bible-booknames.model';

export const BIBLE_BOOKNAMES_OBJECT_TYPE =
	'bible/booknames';

export interface BibleBooknamesStore {
	get(
		id: string
	): Promise<
		BibleBooknames |
		undefined
	>;

	put(
		booknames:
			BibleBooknames
	): Promise<void>;
}

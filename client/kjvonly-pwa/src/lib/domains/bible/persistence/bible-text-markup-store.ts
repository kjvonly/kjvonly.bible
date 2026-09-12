import type {
	BibleTextMarkup
} from '$lib/domains/bible/models/bible-text-markup.model';

export const BIBLE_TEXT_MARKUP_OBJECT_TYPE =
	'bible/text-markup';

export interface BibleTextMarkupStore {
	get(
		id: string
	): Promise<
		BibleTextMarkup |
		undefined
	>;

	put(
		textMarkup:
			BibleTextMarkup
	): Promise<void>;
}

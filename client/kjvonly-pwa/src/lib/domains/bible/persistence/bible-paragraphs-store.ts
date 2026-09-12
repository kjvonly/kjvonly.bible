import type {
	BibleParagraphs
} from '$lib/domains/bible/models/bible-paragraphs.model';

export const BIBLE_PARAGRAPHS_OBJECT_TYPE =
	'bible/paragraphs';

export interface BibleParagraphsStore {
	get(
		id: string
	): Promise<
		BibleParagraphs |
		undefined
	>;

	put(
		paragraphs:
			BibleParagraphs
	): Promise<void>;
}

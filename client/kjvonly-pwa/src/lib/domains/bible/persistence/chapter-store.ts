import type {
	Chapter
} from '$lib/domains/bible/models/bible.model';

export interface ChapterStore {
	get(
		id: string
	): Promise<
		Chapter |
		undefined
	>;

	put(
		chapter:
			Chapter
	): Promise<void>;
}
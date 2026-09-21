import type {
	Chapter
} from '../models/bible.model';

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
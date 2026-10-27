export const BIBLE_CHAPTER_OBJECT_TYPE =
	'bible/chapter';

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
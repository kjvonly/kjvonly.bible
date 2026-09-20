import type {
	ChapterContent
} from '../../models/bible.model';

export interface ValidatedBibleChapterCandidate {
	readonly version:
		string;

	readonly chapterRef:
		string;

	readonly content:
		ChapterContent;
}
import type {
	ChapterContent
} from '$lib/domains/bible/models/bible.model';

export interface ValidatedBibleChapterCandidate {
	readonly version:
		string;

	readonly chapterRef:
		string;

	readonly content:
		ChapterContent;
}
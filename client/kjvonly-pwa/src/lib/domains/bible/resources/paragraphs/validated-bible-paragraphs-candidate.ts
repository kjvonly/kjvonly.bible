import type {
	BibleParagraphMap
} from '$lib/domains/bible/models/bible-paragraphs.model';

export interface ValidatedBibleParagraphsCandidate {
	readonly source:
		string;

	readonly chapterRef:
		string;

	readonly paragraphs:
		BibleParagraphMap;
}

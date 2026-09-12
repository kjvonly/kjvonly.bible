import type {
	BibleTextMarkupMap
} from '$lib/domains/bible/models/bible-text-markup.model';

export interface ValidatedBibleTextMarkupCandidate {
	readonly name:
		string;

	readonly chapterRef:
		string;

	readonly markings:
		BibleTextMarkupMap;
}

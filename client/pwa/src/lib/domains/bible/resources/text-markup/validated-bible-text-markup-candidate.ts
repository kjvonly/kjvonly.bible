import type {
	BibleTextMarkupMap
} from '../../models/bible-text-markup.model';

export interface ValidatedBibleTextMarkupCandidate {
	readonly name:
		string;

	readonly chapterRef:
		string;

	readonly markings:
		BibleTextMarkupMap;
}

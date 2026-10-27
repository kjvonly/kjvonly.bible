import type {
	BibleBooknamesContent
} from '../../models/bible-booknames.model';

export interface ValidatedBibleBooknamesCandidate {
	readonly key:
		string;

	readonly content:
		BibleBooknamesContent;
}

import type {
	BibleBooknamesContent
} from '$lib/domains/bible/models/bible-booknames.model';

export interface ValidatedBibleBooknamesCandidate {
	readonly key:
		string;

	readonly content:
		BibleBooknamesContent;
}

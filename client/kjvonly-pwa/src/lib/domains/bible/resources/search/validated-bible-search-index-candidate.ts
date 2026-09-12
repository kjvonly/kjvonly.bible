import type {
	BibleSearchIndexChunks
} from '$lib/domains/bible/models/bible-search-index.model';

export interface ValidatedBibleSearchIndexCandidate {
	readonly version:
		string;

	readonly chunks:
		BibleSearchIndexChunks;
}

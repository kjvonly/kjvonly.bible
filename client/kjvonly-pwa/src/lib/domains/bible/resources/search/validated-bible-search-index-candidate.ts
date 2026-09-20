import type {
	BibleSearchIndexChunks
} from '../../models/bible-search-index.model';

export interface ValidatedBibleSearchIndexCandidate {
	readonly version:
		string;

	readonly chunks:
		BibleSearchIndexChunks;
}

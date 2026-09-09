import type {
	BiblePericopeMap
} from '$lib/domains/bible/models/bible-pericopes.model';

export interface ValidatedBiblePericopesCandidate {
	readonly source:
		string;

	readonly chapterRef:
		string;

	readonly pericopes:
		BiblePericopeMap;
}

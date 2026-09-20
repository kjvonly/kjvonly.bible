import type {
	BiblePericopeMap
} from '../../models/bible-pericopes.model';

export interface ValidatedBiblePericopesCandidate {
	readonly source:
		string;

	readonly chapterRef:
		string;

	readonly pericopes:
		BiblePericopeMap;
}

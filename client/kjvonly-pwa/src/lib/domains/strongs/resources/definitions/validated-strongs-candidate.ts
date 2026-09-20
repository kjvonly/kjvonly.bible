import type {
	StrongsContent
} from '../../models/strongs.model';

export interface ValidatedStrongsCandidate {
	readonly version:
		string;

	readonly key:
		string;

	readonly content:
		StrongsContent;
}
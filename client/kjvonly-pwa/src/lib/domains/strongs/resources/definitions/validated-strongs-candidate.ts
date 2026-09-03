import type {
	StrongsContent
} from '$lib/domains/strongs/models/strongs.model';

export interface ValidatedStrongsCandidate {
	readonly version:
		string;

	readonly key:
		string;

	readonly content:
		StrongsContent;
}
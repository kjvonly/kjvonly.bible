export type NostrPublicationStatus =
	| 'already-present'
	| 'published';


export interface NostrPublicationResult {
	readonly eventId:
		string;

	readonly relay:
		string;

	readonly status:
		NostrPublicationStatus;
}
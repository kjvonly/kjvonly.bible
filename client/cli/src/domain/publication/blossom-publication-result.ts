export type BlossomPublicationStatus =
	| 'already-present'
	| 'uploaded';


export interface BlossomPublicationResult {
	readonly resourceName:
		string;

	readonly key:
		string;

	readonly sha256:
		string;

	readonly url:
		string;

	readonly status:
		BlossomPublicationStatus;
}
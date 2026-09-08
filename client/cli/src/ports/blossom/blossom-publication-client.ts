import { BlossomPublicationStatus } from "#domain/publication/blossom-publication-result.js";


export interface BlossomPublicationRequest {
	readonly serverUrl:
		string;

	readonly artifactPath:
		string;

	readonly sha256:
		string;

	readonly size:
		number;

	readonly mediaType:
		string;
}


export interface BlossomPublicationClient {

	ensure(
		request:
			BlossomPublicationRequest
	): Promise<
		BlossomPublicationStatus
	>;
}
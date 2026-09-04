import type {
	SignedNostrEvent
} from '../domain/nostr-event.js';


export interface StageSignedEventRequest {
	readonly stagingRoot:
		string;

	readonly resourceName:
		string;

	readonly key:
		string;

	readonly event:
		SignedNostrEvent;
}


export interface SignedEventStagingRepository {
	stage(
		request:
			StageSignedEventRequest
	): Promise<
		string
	>;
}
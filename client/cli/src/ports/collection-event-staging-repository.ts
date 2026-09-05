import type {
	SignedNostrEvent
} from '../domain/nostr-event.js';


export interface StagedCollectionEventEntry {
	readonly path:
		string;

	readonly collectionName:
		string;

	readonly eventId:
		string;
}


export interface StageCollectionEventRequest {
	readonly stagingRoot:
		string;

	readonly collectionName:
		string;

	readonly event:
		SignedNostrEvent;

	readonly previous?:
		StagedCollectionEventEntry;
}


export interface CollectionEventStagingRepository {
	list(
		stagingRoot:
			string
	): Promise<
		readonly StagedCollectionEventEntry[]
	>;


	read(
		entry:
			StagedCollectionEventEntry
	): Promise<
		SignedNostrEvent
	>;


	stage(
		request:
			StageCollectionEventRequest
	): Promise<
		StagedCollectionEventEntry
	>;


	remove(
		entry:
			StagedCollectionEventEntry
	): Promise<void>;
}
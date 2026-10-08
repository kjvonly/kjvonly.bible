import { SignedNostrEvent } from "#domain/event/nostr-event.js";

/** Metadata for one generated Collection event currently present in staging. */
export interface StagedCollectionEventEntry {
	readonly path:
		string;

	readonly collectionName:
		string;

	readonly createdAt:
		number;

	readonly eventId:
		string;
}


/** Request to atomically replace one manifest Collection's staged event. */
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


/** Persistence boundary for generated Collection Resource events. */
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
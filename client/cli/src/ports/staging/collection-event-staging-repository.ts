import { SignedNostrEvent } from "#domain/event/nostr-event.js";

/** Metadata for one generated Collection event currently present in staging. */
export interface StagedCollectionEventEntry {
	readonly path:
		string;

	readonly collectionName:
		string;

	/** Absent only for legacy pre-reuse Collection staging. */
	readonly inputRevision?:
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

	readonly inputRevision:
		string;

	readonly event:
		SignedNostrEvent;

	readonly previous?:
		StagedCollectionEventEntry;
}


/** Persistence boundary for generated Collection Resource events. */
export interface CollectionEventStagingRepository {
	/** Lists current and legacy Collection staging metadata without reading event JSON. */
	list(
		stagingRoot:
			string
	): Promise<
		readonly StagedCollectionEventEntry[]
	>;


	/** Reads and validates one exact staged Collection event. */
	read(
		entry:
			StagedCollectionEventEntry
	): Promise<
		SignedNostrEvent
	>;


	/** Atomically stages a revision-bearing Collection event and removes its predecessor. */
	stage(
		request:
			StageCollectionEventRequest
	): Promise<
		StagedCollectionEventEntry
	>;


	/** Removes obsolete local Collection staging only. */
	remove(
		entry:
			StagedCollectionEventEntry
	): Promise<void>;
}
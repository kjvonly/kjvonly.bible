import { SignedNostrEvent } from "#domain/event/nostr-event.js";
import { StagedEventMetadata } from "#domain/staging/staged-event-filename.js";



/** Metadata and local path for one staged concrete Resource event. */
export interface StagedEventEntry {
	readonly path:
		string;

	readonly metadata:
		StagedEventMetadata;
}


/** Request to atomically replace one concrete Resource's staged signed event. */
export interface StageSignedEventRequest {
	readonly stagingRoot:
		string;

	readonly resourceName:
		string;

	readonly key:
		string;

	readonly sourceMtimeMs:
		number;

	readonly sourceSize:
		number;

	readonly createdAt:
		number;
		
	readonly definitionRevision:
		string;

	readonly event:
		SignedNostrEvent;

	readonly previous?:
		StagedEventEntry;
}


/** Persistence boundary for concrete signed Resource-event staging. */
export interface SignedEventStagingRepository {
	list(
		stagingRoot:
			string,

		resourceName:
			string
	): Promise<
		readonly StagedEventEntry[]
	>;


	read(
		entry:
			StagedEventEntry
	): Promise<
		SignedNostrEvent
	>;


	stage(
		request:
			StageSignedEventRequest
	): Promise<
		StagedEventEntry
	>;


	remove(
		entry:
			StagedEventEntry
	): Promise<void>;
}
import { SignedNostrEvent } from "#domain/event/nostr-event.js";
import { StagedEventMetadata } from "#domain/staging/staged-event-filename.js";



export interface StagedEventEntry {
	readonly path:
		string;

	readonly metadata:
		StagedEventMetadata;
}


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
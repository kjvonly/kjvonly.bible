import type {
	SignedNostrEvent
} from '../domain/nostr-event.js';


export interface StagedNostrEventEntry {
	readonly path:
		string;

	readonly eventId:
		string;

	readonly createdAt:
		number;
}


export interface NostrEventStagingRepository {
	list(
		stagingRoot:
			string
	): Promise<
		readonly StagedNostrEventEntry[]
	>;


	read(
		entry:
			StagedNostrEventEntry
	): Promise<
		SignedNostrEvent
	>;
}
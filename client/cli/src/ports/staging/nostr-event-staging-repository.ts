import { SignedNostrEvent } from "#domain/event/nostr-event.js";

/** Staging groups exposed to application-owned Nostr publication policy. */
export type StagedNostrEventCategory =
	| 'resource'
	| 'collection'
	| 'filesystem';


/** Metadata needed to reconcile one staged Nostr event without reading JSON. */
export interface StagedNostrEventEntry {
	readonly path:
		string;

	readonly eventId:
		string;

	readonly createdAt:
		number;
}


/**
 * Application-facing staging boundary for category-specific Nostr publication.
 * Implementations expose staged state; callers own category participation/order.
 */
export interface NostrEventStagingRepository {
	/** Lists one requested staging category without imposing publication order. */
	list(
		stagingRoot:
			string,

		category:
			StagedNostrEventCategory
	): Promise<
		readonly StagedNostrEventEntry[]
	>;


	/** Reads the exact signed event represented by previously listed metadata. */
	read(
		entry:
			StagedNostrEventEntry
	): Promise<
		SignedNostrEvent
	>;
}

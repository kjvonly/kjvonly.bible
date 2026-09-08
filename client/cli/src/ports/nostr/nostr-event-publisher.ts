import { SignedNostrEvent } from "#domain/event/nostr-event.js";

export interface NostrEventPublisher {
	publish(
		relay:
			string,

		event:
			SignedNostrEvent
	): Promise<void>;
}
import { SignedNostrEvent } from "#domain/event/nostr-event.js";

export interface NostrEventPublisher {
	publish(
		relay:
			string,

		event:
			SignedNostrEvent
	): Promise<void>;

	/** Release the relay connection after the publication batch ends. */
	close(relay: string): void;
}
import type {
	SignedNostrEvent
} from '../domain/nostr-event.js';


export interface NostrEventPublisher {
	publish(
		relay:
			string,

		event:
			SignedNostrEvent
	): Promise<void>;
}
import type {
	SignedNostrEvent,
	UnsignedNostrEvent
} from '../domain/nostr-event.js';


export interface EventSigner {
	getPublicKey():
		Promise<string>;


	sign(
		event:
			UnsignedNostrEvent
	): Promise<
		SignedNostrEvent
	>;
}
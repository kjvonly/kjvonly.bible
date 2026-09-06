import { SignedNostrEvent, UnsignedNostrEvent } from "../../domain/event/nostr-event.js";

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
import type {
	NostrEvent
} from '$lib/infrastructure/nostr/events/models/nostr-event';

export interface NostrEventsStore {
	get(
		key: string
	): Promise<
		NostrEvent |
		undefined
	>;

	getByKindAndPubkey(
		kind: number,
		pubkey: string
	): Promise<
		NostrEvent |
		undefined
	>;

	put(
		event: NostrEvent
	): Promise<void>;
}

import type {
	NostrEventPublicationIntent
} from '$lib/infrastructure/nostr/events/publication/nostr-event-publication';

import type {
	NostrEvent
} from '$lib/infrastructure/nostr/events/models/nostr-event';

export interface NostrEventWriteStores {
	readonly events: {
		put(
			event: NostrEvent
		): Promise<void>;
	};

	readonly outbox: {
		put(
			key: string,
			publication:
				NostrEventPublicationIntent
		): Promise<void>;
	};
}

export interface NostrEventWriteTransaction {
	run<TResult>(
		operation:
			(
				stores:
					NostrEventWriteStores
			) => Promise<TResult>
	): Promise<TResult>;
}

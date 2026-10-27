import type {
	OutboxPublicationIntent
} from '$lib/application';

import type {
	NostrEvent
} from '$lib/infrastructure/nostr/events/models/nostr-event';

export interface NostrEventPublicationIntent
	extends OutboxPublicationIntent {
	readonly type:
		'nostr-event';

	readonly publisher:
		string;

	readonly event: {
		readonly kind:
			number;

		readonly content:
			string;

		readonly tags:
			readonly (
				readonly string[]
			)[];
	};
}

export class NostrEventPublication {

	create(
		event: NostrEvent
	): NostrEventPublicationIntent {
		return {
			type:
				'nostr-event',

			publisher:
				event.pubkey,
			event: {
				kind:
					event.kind,
				content:
					event.content,
				tags:
					event.tags
			}
		};
	}
}

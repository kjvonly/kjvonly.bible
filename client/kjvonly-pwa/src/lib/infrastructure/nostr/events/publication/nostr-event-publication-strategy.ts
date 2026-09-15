import type {
	OutboxPublicationIntent
} from '$lib/application/outbox/outbox-publication-intent';

import type {
	OutboxPublicationStrategy
} from '$lib/application/outbox/outbox-publication-strategy';

import type {
	NostrClient
} from '$lib/infrastructure/nostr/client/nostr-client';

import type {
	NostrEventPublicationIntent
} from './nostr-event-publication';

export class NostrEventPublicationStrategy
	implements OutboxPublicationStrategy {
	readonly type =
		'nostr-event';

	constructor(
		private readonly client:
			Pick<
				NostrClient,
				'getPublicKey' |
					'publishEvent'
			>
	) {}

	async publish(
		publication:
			OutboxPublicationIntent
	): Promise<void> {
		if (
			publication.type !==
			this.type
		) {
			throw new Error(
				`NostrEventPublicationStrategy cannot publish Outbox type: ${publication.type}`
			);
		}

		const intent =
			publication as
				NostrEventPublicationIntent;

		const pubkey =
			await this.client
				.getPublicKey();

		if (
			pubkey !==
			intent.publisher
		) {
			throw new Error(
				`Nostr event publisher does not match configured signer: ${intent.publisher}`
			);
		}

		const result =
			await this.client
				.publishEvent({
					kind:
						intent.event.kind,
					content:
						intent.event.content,
					tags:
						intent.event.tags
							.map(
								(tag) =>
									[...tag]
							)
				});

		if (
			!result.acceptedByAnyRelay
		) {
			throw new Error(
				'Nostr event publication was rejected by all configured relays.'
			);
		}
	}
}

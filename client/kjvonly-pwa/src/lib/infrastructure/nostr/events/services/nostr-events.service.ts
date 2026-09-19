import type {
	Event as SignedNostrEvent
} from 'nostr-typedef';

import type {
	OutboxWakeup
} from '$lib/application';

import {
	createReplaceableNostrEventKey,
	type NostrEvent
} from '$lib/infrastructure/nostr/events/models/nostr-event';

import type {
	NostrEventsStore
} from '$lib/infrastructure/nostr/events/persistence/nostr-events-store';

import type {
	NostrEventPublication
} from '$lib/infrastructure/nostr/events/publication/nostr-event-publication';

import type {
	NostrEventWriteTransaction
} from '$lib/infrastructure/nostr/events/publication/nostr-event-write-stores';

export class NostrEventsService {

	constructor(
		private readonly events:
			Pick<
				NostrEventsStore,
				'get' |
					'getByKindAndPubkey' |
					'put'
			>,

		private readonly writeTransaction:
			NostrEventWriteTransaction,

		private readonly publication:
			Pick<
				NostrEventPublication,
				'create'
			>,

		private readonly outbox:
			OutboxWakeup
	) {}

	async get(
		key: string
	): Promise<
		NostrEvent |
		undefined
	> {
		return await this.events.get(
			key
		);
	}

	async getByKindAndPubkey(
		kind: number,
		pubkey: string
	): Promise<
		NostrEvent |
		undefined
	> {
		return await this.events
			.getByKindAndPubkey(
				kind,
				pubkey
			);
	}

	async cache(
		event: SignedNostrEvent
	): Promise<void> {
		const current =
			await this.events
				.getByKindAndPubkey(
					event.kind,
					event.pubkey
				);

		if (
			current !== undefined &&
			!this.shouldCache(
				current,
				event
			)
		) {
			return;
		}

		await this.events.put({
			key:
				createReplaceableNostrEventKey(
					event.kind,
					event.pubkey
				),
			pubkey:
				event.pubkey,
			kind:
				event.kind,
			content:
				event.content,
			tags:
				event.tags,
			created_at:
				event.created_at,
			id:
				event.id,
			sig:
				event.sig
		});
	}

	async put(
		event: NostrEvent
	): Promise<void> {
		const publication =
			this.publication.create(
				event
			);

		await this.writeTransaction.run(
			async (
				stores
			) => {
				await stores.events.put(
					event
				);

				await stores.outbox.put(
					event.key,
					publication
				);
			}
		);

		this.outbox.wake();
	}

	private shouldCache(
		current: NostrEvent,
		incoming: SignedNostrEvent
	): boolean {
		const currentIsUnsigned =
			current.id === undefined ||
			current.sig === undefined;

		if (currentIsUnsigned) {
			return (
				current.content ===
					incoming.content &&
				JSON.stringify(
					current.tags
				) ===
				JSON.stringify(
					incoming.tags
				)
			);
		}

		if (
			current.created_at ===
			undefined
		) {
			return true;
		}

		return incoming.created_at >
			current.created_at;
	}
}

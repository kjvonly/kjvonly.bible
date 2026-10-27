import type {
	NostrEvent
} from '$lib/infrastructure/nostr/events/models/nostr-event';

import type {
	NostrEventsStore
} from './nostr-events-store';

import {
	NOSTR_EVENTS,
	NOSTR_EVENT_KIND_PUBKEY_INDEX,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBNostrEventsStore
	implements NostrEventsStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		key: string
	): Promise<
		NostrEvent |
		undefined
	> {
		const db =
			await this.getDB();

		return await db.get(
			NOSTR_EVENTS,
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
		const db =
			await this.getDB();

		return await db.getFromIndex(
			NOSTR_EVENTS,
			NOSTR_EVENT_KIND_PUBKEY_INDEX,
			[kind, pubkey]
		);
	}

	async put(
		event: NostrEvent
	): Promise<void> {
		const db =
			await this.getDB();

		await db.put(
			NOSTR_EVENTS,
			event
		);
	}
}

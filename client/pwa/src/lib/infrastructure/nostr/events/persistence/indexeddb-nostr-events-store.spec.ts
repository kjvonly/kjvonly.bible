import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NOSTR_EVENTS,
	NOSTR_EVENT_KIND_PUBKEY_INDEX,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	IndexedDBNostrEventsStore
} from './indexeddb-nostr-events-store';

import type {
	NostrEvent
} from '$lib/infrastructure/nostr/events/models/nostr-event';

describe(
	'IndexedDBNostrEventsStore',
	() => {
		it(
			'persists and reads a Nostr event by key',
			async () => {
				const db =
					new FakeApplicationDB();

				const store =
					new IndexedDBNostrEventsStore(
						async () =>
							db.asApplicationDB()
					);

				const event =
					createEvent();

				await store.put(
					event
				);

				expect(
					await store.get(
						event.key
					)
				).toEqual(
					event
				);
			}
		);

		it(
			'reads the replaceable Nostr event by kind and pubkey',
			async () => {
				const db =
					new FakeApplicationDB();

				const store =
					new IndexedDBNostrEventsStore(
						async () =>
							db.asApplicationDB()
					);

				const event =
					createEvent();

				await store.put(
					event
				);

				expect(
					await store
						.getByKindAndPubkey(
							event.kind,
							event.pubkey
						)
				).toEqual(
					event
				);
			}
		);
	}
);

function createEvent():
	NostrEvent {
	return {
		key:
			'nostr/event:3:user-id',
		pubkey:
			'user-id',
		kind: 3,
		content:
			'',
		tags: []
	};
}

class FakeApplicationDB {
	private readonly values =
		new Map<
			string,
			NostrEvent
		>();

	asApplicationDB():
		ApplicationDB {
		return {
			get:
				async (
					storeName: string,
					key: string
				) => {
					expect(storeName)
						.toBe(
							NOSTR_EVENTS
						);

					return this.values.get(
						key
					);
				},

			getFromIndex:
				async (
					storeName: string,
					indexName: string,
					key: [number, string]
				) => {
					expect(storeName)
						.toBe(
							NOSTR_EVENTS
						);

					expect(indexName)
						.toBe(
							NOSTR_EVENT_KIND_PUBKEY_INDEX
						);

					return [
						...this.values.values()
					].find(
						(event) =>
							event.kind ===
								key[0] &&
							event.pubkey ===
								key[1]
					);
				},

			put:
				async (
					storeName: string,
					value: NostrEvent
				) => {
					expect(storeName)
						.toBe(
							NOSTR_EVENTS
						);

					this.values.set(
						value.key,
						value
					);
				}
		} as unknown as ApplicationDB;
	}
}

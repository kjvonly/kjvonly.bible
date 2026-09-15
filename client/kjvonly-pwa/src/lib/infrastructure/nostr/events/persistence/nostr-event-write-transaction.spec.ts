import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NOSTR_EVENTS,
	OUTBOX,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	IndexedDBNostrEventWriteTransaction
} from './nostr-event-write-transaction';

import type {
	NostrEvent
} from '$lib/infrastructure/nostr/events/models/nostr-event';

import type {
	NostrEventPublicationIntent
} from '$lib/infrastructure/nostr/events/publication/nostr-event-publication';

describe(
	'IndexedDBNostrEventWriteTransaction',
	() => {
		it(
			'opens one readwrite transaction over Nostr Events and Outbox',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBNostrEventWriteTransaction(
						async () =>
							db.asApplicationDB()
					);

				await transaction.run(
					async () => {}
				);

				expect(db.storeNames)
					.toEqual([
						NOSTR_EVENTS,
						OUTBOX
					]);

				expect(db.mode)
					.toBe(
						'readwrite'
					);
			}
		);

		it(
			'persists the Nostr event and publication under the same key',
			async () => {
				const db =
					new FakeApplicationDB();

				const transaction =
					new IndexedDBNostrEventWriteTransaction(
						async () =>
							db.asApplicationDB()
					);

				const event =
					createEvent();

				const publication =
					createPublication();

				await transaction.run(
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

				expect(
					db.getStoredValue(
						NOSTR_EVENTS,
						event.key
					)
				).toEqual(
					event
				);

				expect(
					db.getStoredValue(
						OUTBOX,
						event.key
					)
				).toEqual({
					id:
						event.key,
					publication,
					status:
						'pending',
					attempts:
						0
				});
			}
		);
	}
);

function createEvent():
	NostrEvent {
	return {
		key:
			'nostr/event:0:user-id',
		pubkey:
			'user-id',
		kind: 0,
		content:
			'{}',
		tags: []
	};
}

function createPublication():
	NostrEventPublicationIntent {
	return {
		type:
			'nostr-event',

		publisher:
			'user-id',
		event: {
			kind: 0,
			content:
				'{}',
			tags: []
		}
	};
}

class FakeApplicationDB {
	storeNames:
		readonly string[] =
			[];

	mode:
		IDBTransactionMode |
		undefined;

	private readonly stores =
		new Map<
			string,
			Map<string, unknown>
		>();

	asApplicationDB():
		ApplicationDB {
		return {
			transaction:
				(
					storeNames:
						readonly string[],
					mode:
						IDBTransactionMode
				) => {
					this.storeNames = [
						...storeNames
					];

					this.mode =
						mode;

					return this.createTransaction();
				}
		} as unknown as ApplicationDB;
	}

	getStoredValue(
		storeName: string,
		key: string
	): unknown {
		return this.stores
			.get(
				storeName
			)
			?.get(
				key
			);
	}

	private createTransaction() {
		return {
			objectStore:
				(
					storeName: string
				) =>
					this.createObjectStore(
						storeName
					),
			abort:
				() => {},
			done:
				Promise.resolve()
		};
	}

	private createObjectStore(
		storeName: string
	) {
		let store =
			this.stores.get(
				storeName
			);

		if (!store) {
			store =
				new Map<
					string,
					unknown
				>();

			this.stores.set(
				storeName,
				store
			);
		}

		return {
			put:
				async (
					value: {
						id?: string;
						key?: string;
					}
				) => {
					const key =
						value.id ??
						value.key;

					if (!key) {
						throw new Error(
							'Missing key'
						);
					}

					store?.set(
						key,
						value
					);
				}
		};
	}
}

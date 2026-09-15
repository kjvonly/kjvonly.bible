import type {
	NostrEventWriteStores,
	NostrEventWriteTransaction
} from '$lib/infrastructure/nostr/events/publication/nostr-event-write-stores';

import {
	createPendingPublication
} from '$lib/application/outbox/outbox-entry';

import {
	NOSTR_EVENTS,
	OUTBOX,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

export class IndexedDBNostrEventWriteTransaction
	implements NostrEventWriteTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					NostrEventWriteStores
			) => Promise<TResult>
	): Promise<TResult> {
		const db =
			await this.getDB();

		const transaction =
			db.transaction(
				[
					NOSTR_EVENTS,
					OUTBOX
				],
				'readwrite'
			);

		const events =
			transaction.objectStore(
				NOSTR_EVENTS
			);

		const outbox =
			transaction.objectStore(
				OUTBOX
			);

		const stores:
			NostrEventWriteStores = {
				events: {
					put:
						async (
							event
						) => {
							await events.put(
								event
							);
						}
				},

				outbox: {
					put:
						async (
							key,
							publication
						) => {
							await outbox.put(
								createPendingPublication(
									key,
									publication
								)
							);
						}
				}
			};

		try {
			const result =
				await operation(
					stores
				);

			await transaction.done;

			return result;
		} catch (error) {
			try {
				transaction.abort();
			} catch {
				// Transaction may already be inactive.
			}

			try {
				await transaction.done;
			} catch {
				// Preserve the original operation error.
			}

			throw error;
		}
	}
}

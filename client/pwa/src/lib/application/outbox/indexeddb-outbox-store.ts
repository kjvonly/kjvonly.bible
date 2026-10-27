import {
	OUTBOX,
	OUTBOX_STATUS_INDEX,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	type OutboxEntry,
	type OutboxStatus
} from './outbox-entry';

import type {
	OutboxPublicationIntent
} from './outbox-publication-intent';

import type {
	OutboxStore
} from './outbox-store';

export class IndexedDBOutboxStore
	implements OutboxStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		id: string
	): Promise<
		OutboxEntry |
		undefined
	> {
		const db =
			await this.getDB();

		const entry =
			await db.get(
				OUTBOX,
				id
			);

		return entry;
	}

	async put(
		entry:
			OutboxEntry
	): Promise<void> {
		const db =
			await this.getDB();

		await db.put(
			OUTBOX,
			entry
		);
	}

	async listByStatus(
		status:
			OutboxStatus
	): Promise<
		readonly OutboxEntry[]
	> {
		const db =
			await this.getDB();

		const entries =
			await db.getAllFromIndex(
				OUTBOX,
				OUTBOX_STATUS_INDEX,
				status
			);

		return entries;
	}

	async deleteIfCurrent(
		entry:
			OutboxEntry
	): Promise<boolean> {
		const db =
			await this.getDB();

		const transaction =
			db.transaction(
				OUTBOX,
				'readwrite'
			);

		const store =
			transaction.objectStore(
				OUTBOX
			);

		const storedCurrent =
			await store.get(
				entry.id
			);

		if (!storedCurrent) {
			await transaction.done;
			return false;
		}

		const current =
			storedCurrent;

		if (
			current.status !== 'pending' ||
			!isSameOutboxPublicationIntent(
				current.publication,
				entry.publication
			)
		) {
			await transaction.done;
			return false;
		}

		await store.delete(
			entry.id
		);

		await transaction.done;

		return true;
	}
}

function isSameOutboxPublicationIntent(
	left: OutboxPublicationIntent,
	right: OutboxPublicationIntent
): boolean {
	return (
		JSON.stringify(
			left
		) ===
		JSON.stringify(
			right
		)
	);
}

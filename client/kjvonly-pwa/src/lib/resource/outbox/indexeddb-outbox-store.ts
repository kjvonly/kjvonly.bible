import {
	OUTBOX,
	OUTBOX_STATUS_INDEX,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

import type {
	OutboxEntry,
	OutboxStatus
} from './outbox-entry';

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

		return await db.get(
			OUTBOX,
			id
		);
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

		return await db.getAllFromIndex(
			OUTBOX,
			OUTBOX_STATUS_INDEX,
			status
		);
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

		const current =
			await store.get(
				entry.id
			);

		if (
			!current ||
			current.status !== 'pending' ||
			!isSameResourcePublication(
				current.resource,
				entry.resource
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

function isSameResourcePublication(
	left: ResourcePublication,
	right: ResourcePublication
): boolean {
	return (
		left.publisher ===
			right.publisher &&
		left.resourceType ===
			right.resourceType &&
		left.resourceId ===
			right.resourceId &&
		JSON.stringify(
			left.value
		) ===
			JSON.stringify(
				right.value
			)
	);
}

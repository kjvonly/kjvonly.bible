import {
	RESOURCE_RECEIPTS,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import type {
	ResourceReceiptStore
} from './resource-receipt-store';

import {
	createResourceReceiptId,
	type ResourceReceipt
} from './resource-receipt';

export class IndexedDBResourceReceiptStore
	implements ResourceReceiptStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	async get(
		publisher: string,
		resourceId: string
	): Promise<
		ResourceReceipt |
		undefined
	> {

		const db =
			await this.getDB();

		return await db.get(
			RESOURCE_RECEIPTS,
			createResourceReceiptId(
				publisher,
				resourceId
			)
		);
	}

	async put(
		receipt:
			ResourceReceipt
	): Promise<void> {

		const db =
			await this.getDB();

		await db.put(
			RESOURCE_RECEIPTS,
			receipt
		);
	}

	async delete(
		publisher: string,
		resourceId: string
	): Promise<void> {

		const db =
			await this.getDB();

		await db.delete(
			RESOURCE_RECEIPTS,
			createResourceReceiptId(
				publisher,
				resourceId
			)
		);
	}
}
import type {
	ResourceReceiptStore
} from './resource-receipt-store';

import {
	createResourceReceiptId
} from './resource-receipt';

export class ResourceReceiptService {

	constructor(
		private readonly store:
			ResourceReceiptStore
	) {}

	async needsProcessing(
		publisher: string,
		resourceId: string,
		modifiedAt: number
	): Promise<boolean> {

		const receipt =
			await this.store.get(
				publisher,
				resourceId
			);

		if (
			receipt ===
			undefined
		) {
			return true;
		}

		return (
			modifiedAt >
			receipt.modifiedAt
		);
	}

	async markProcessed(
		publisher: string,
		resourceId: string,
		modifiedAt: number
	): Promise<void> {

		await this.store.put({
			id:
				createResourceReceiptId(
					publisher,
					resourceId
				),

			publisher,

			resourceId,

			modifiedAt
		});
	}

	async remove(
		publisher: string,
		resourceId: string
	): Promise<void> {

		await this.store.delete(
			publisher,
			resourceId
		);
	}
}
import {
	describe,
	expect,
	it
} from 'vitest';

import {
	ResourceReceiptService
} from './resource-receipt.service';

import {
	createResourceReceiptId,
	type ResourceReceipt
} from './resource-receipt';

import type {
	ResourceReceiptStore
} from './resource-receipt-store';

describe(
	'ResourceReceiptService',
	() => {

		it(
			'needs processing when no receipt exists',
			async () => {
				const store =
					new FakeResourceReceiptStore();

				const service =
					new ResourceReceiptService(
						store
					);

				expect(
					await service.needsProcessing(
						'publisher',
						'kjvonly/bible/chapters/kjvs',
						100
					)
				).toBe(
					true
				);
			}
		);

		it(
			'needs processing when the incoming Resource is newer',
			async () => {
				const store =
					createStoreWithReceipt(
						100
					);

				const service =
					new ResourceReceiptService(
						store
					);

				expect(
					await service.needsProcessing(
						'publisher',
						'kjvonly/bible/chapters/kjvs',
						101
					)
				).toBe(
					true
				);
			}
		);

		it(
			'skips processing when the incoming Resource has the same modified time',
			async () => {
				const store =
					createStoreWithReceipt(
						100
					);

				const service =
					new ResourceReceiptService(
						store
					);

				expect(
					await service.needsProcessing(
						'publisher',
						'kjvonly/bible/chapters/kjvs',
						100
					)
				).toBe(
					false
				);
			}
		);

		it(
			'skips processing when the incoming Resource is older',
			async () => {
				const store =
					createStoreWithReceipt(
						100
					);

				const service =
					new ResourceReceiptService(
						store
					);

				expect(
					await service.needsProcessing(
						'publisher',
						'kjvonly/bible/chapters/kjvs',
						99
					)
				).toBe(
					false
				);
			}
		);

		it(
			'marks a Resource revision as processed',
			async () => {
				const store =
					new FakeResourceReceiptStore();

				const service =
					new ResourceReceiptService(
						store
					);

				await service.markProcessed(
					'publisher',
					'kjvonly/bible/chapters/kjvs',
					100
				);

				expect(
					await store.get(
						'publisher',
						'kjvonly/bible/chapters/kjvs'
					)
				).toEqual({
					id:
						createResourceReceiptId(
							'publisher',
							'kjvonly/bible/chapters/kjvs'
						),

					publisher:
						'publisher',

					resourceId:
						'kjvonly/bible/chapters/kjvs',

					modifiedAt:
						100
				});
			}
		);

		it(
			'removes a Resource receipt',
			async () => {
				const store =
					createStoreWithReceipt(
						100
					);

				const service =
					new ResourceReceiptService(
						store
					);

				await service.remove(
					'publisher',
					'kjvonly/bible/chapters/kjvs'
				);

				expect(
					await store.get(
						'publisher',
						'kjvonly/bible/chapters/kjvs'
					)
				).toBeUndefined();
			}
		);
	}
);

function createStoreWithReceipt(
	modifiedAt: number
): FakeResourceReceiptStore {

	const store =
		new FakeResourceReceiptStore();

	store.receipts.set(
		createResourceReceiptId(
			'publisher',
			'kjvonly/bible/chapters/kjvs'
		),
		{
			id:
				createResourceReceiptId(
					'publisher',
					'kjvonly/bible/chapters/kjvs'
				),

			publisher:
				'publisher',

			resourceId:
				'kjvonly/bible/chapters/kjvs',

			modifiedAt
		}
	);

	return store;
}

class FakeResourceReceiptStore
	implements ResourceReceiptStore {

	readonly receipts =
		new Map<
			string,
			ResourceReceipt
		>();

	async get(
		publisher: string,
		resourceId: string
	): Promise<
		ResourceReceipt |
		undefined
	> {
		return this.receipts.get(
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
		this.receipts.set(
			receipt.id,
			receipt
		);
	}

	async delete(
		publisher: string,
		resourceId: string
	): Promise<void> {
		this.receipts.delete(
			createResourceReceiptId(
				publisher,
				resourceId
			)
		);
	}
}
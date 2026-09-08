import {
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';

import {
	getApplicationDB,
	RESOURCE_RECEIPTS
} from '$lib/infrastructure/persistence/application.db';

import {
	IndexedDBResourceReceiptStore
} from '$lib/resource/receipts/indexeddb-resource-receipt-store';

import {
	createResourceReceiptId
} from '$lib/resource/receipts/resource-receipt';

describe(
	'IndexedDBResourceReceiptStore',
	() => {

		beforeEach(
			async () => {
				const db =
					await getApplicationDB();

				await db.clear(
					RESOURCE_RECEIPTS
				);
			}
		);

		it(
			'returns undefined when a receipt does not exist',
			async () => {
				const store =
					new IndexedDBResourceReceiptStore(
						getApplicationDB
					);

				expect(
					await store.get(
						'publisher',
						'kjvonly/bible/chapters/kjvs'
					)
				).toBeUndefined();
			}
		);

		it(
			'stores and retrieves a Resource receipt',
			async () => {
				const store =
					new IndexedDBResourceReceiptStore(
						getApplicationDB
					);

				await store.put({
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
			'replaces an existing receipt for the same Resource',
			async () => {
				const store =
					new IndexedDBResourceReceiptStore(
						getApplicationDB
					);

				const id =
					createResourceReceiptId(
						'publisher',
						'kjvonly/bible/chapters/kjvs'
					);

				await store.put({
					id,

					publisher:
						'publisher',

					resourceId:
						'kjvonly/bible/chapters/kjvs',

					modifiedAt:
						100
				});

				await store.put({
					id,

					publisher:
						'publisher',

					resourceId:
						'kjvonly/bible/chapters/kjvs',

					modifiedAt:
						200
				});

				expect(
					await store.get(
						'publisher',
						'kjvonly/bible/chapters/kjvs'
					)
				).toEqual({
					id,

					publisher:
						'publisher',

					resourceId:
						'kjvonly/bible/chapters/kjvs',

					modifiedAt:
						200
				});
			}
		);

		it(
			'keeps receipts for different Resources independent',
			async () => {
				const store =
					new IndexedDBResourceReceiptStore(
						getApplicationDB
					);

				await store.put({
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

				await store.put({
					id:
						createResourceReceiptId(
							'publisher',
							'kjvonly/strongs/definitions/kjvs'
						),

					publisher:
						'publisher',

					resourceId:
						'kjvonly/strongs/definitions/kjvs',

					modifiedAt:
						200
				});

				expect(
					await store.get(
						'publisher',
						'kjvonly/bible/chapters/kjvs'
					)
				).toMatchObject({
					modifiedAt:
						100
				});

				expect(
					await store.get(
						'publisher',
						'kjvonly/strongs/definitions/kjvs'
					)
				).toMatchObject({
					modifiedAt:
						200
				});
			}
		);

		it(
			'keeps receipts for the same Resource ID from different publishers independent',
			async () => {
				const store =
					new IndexedDBResourceReceiptStore(
						getApplicationDB
					);

				const resourceId =
					'kjvonly/bible/chapters/kjvs';

				await store.put({
					id:
						createResourceReceiptId(
							'publisher-a',
							resourceId
						),

					publisher:
						'publisher-a',

					resourceId,

					modifiedAt:
						100
				});

				await store.put({
					id:
						createResourceReceiptId(
							'publisher-b',
							resourceId
						),

					publisher:
						'publisher-b',

					resourceId,

					modifiedAt:
						200
				});

				expect(
					await store.get(
						'publisher-a',
						resourceId
					)
				).toMatchObject({
					modifiedAt:
						100
				});

				expect(
					await store.get(
						'publisher-b',
						resourceId
					)
				).toMatchObject({
					modifiedAt:
						200
				});
			}
		);

		it(
			'deletes a Resource receipt',
			async () => {
				const store =
					new IndexedDBResourceReceiptStore(
						getApplicationDB
					);

				const publisher =
					'publisher';

				const resourceId =
					'kjvonly/bible/chapters/kjvs';

				await store.put({
					id:
						createResourceReceiptId(
							publisher,
							resourceId
						),

					publisher,

					resourceId,

					modifiedAt:
						100
				});

				await store.delete(
					publisher,
					resourceId
				);

				expect(
					await store.get(
						publisher,
						resourceId
					)
				).toBeUndefined();
			}
		);
	}
);
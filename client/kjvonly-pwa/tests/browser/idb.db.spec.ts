import {
	describe,
	expect,
	it
} from 'vitest';

import IndexedDB from '$lib/infrastructure/persistence/idb.db';

const CHAPTERS =
	'chapters';

const RESOURCE_INSTALLATIONS =
	'resource_installations';

describe(
	'IndexedDB.runReadWriteTransaction',
	() => {
		it(
			'commits writes to multiple stores',
			async () => {
				const db =
					await createDatabase();

				await db.runReadWriteTransaction(
					[
						CHAPTERS,
						RESOURCE_INSTALLATIONS
					],
					async (tx) => {
						await tx.putValue(
							CHAPTERS,
							{
								id:
									'publisher/kjvs/1_1',

								value:
									'chapter'
							}
						);

						await tx.putValue(
							RESOURCE_INSTALLATIONS,
							{
								id:
									'bible/chapter:publisher/kjvs/1_1',

								modifiedAt:
									100
							}
						);
					}
				);

				expect(
					await db.getValue(
						CHAPTERS,
						'publisher/kjvs/1_1'
					)
				).toEqual({
					id:
						'publisher/kjvs/1_1',

					value:
						'chapter'
				});

				expect(
					await db.getValue(
						RESOURCE_INSTALLATIONS,
						'bible/chapter:publisher/kjvs/1_1'
					)
				).toEqual({
					id:
						'bible/chapter:publisher/kjvs/1_1',

					modifiedAt:
						100
				});
			}
		);

		it(
			'rolls back writes to every store when the operation throws',
			async () => {
				const db =
					await createDatabase();

				await expect(
					db.runReadWriteTransaction(
						[
							CHAPTERS,
							RESOURCE_INSTALLATIONS
						],
						async (tx) => {
							await tx.putValue(
								CHAPTERS,
								{
									id:
										'publisher/kjvs/1_1',

									value:
										'chapter'
								}
							);

							await tx.putValue(
								RESOURCE_INSTALLATIONS,
								{
									id:
										'bible/chapter:publisher/kjvs/1_1',

									modifiedAt:
										100
								}
							);

							throw new Error(
								'installation failed'
							);
						}
					)
				).rejects.toThrow(
					'installation failed'
				);

				expect(
					await db.getValue(
						CHAPTERS,
						'publisher/kjvs/1_1'
					)
				).toBeUndefined();

				expect(
					await db.getValue(
						RESOURCE_INSTALLATIONS,
						'bible/chapter:publisher/kjvs/1_1'
					)
				).toBeUndefined();
			}
		);

		it(
			'can read writes made earlier in the same transaction',
			async () => {
				const db =
					await createDatabase();

				await db.runReadWriteTransaction(
					[
						CHAPTERS
					],
					async (tx) => {
						await tx.putValue(
							CHAPTERS,
							{
								id:
									'publisher/kjvs/1_1',

								value:
									'chapter'
							}
						);

						const chapter =
							await tx.getValue(
								CHAPTERS,
								'publisher/kjvs/1_1'
							);

						expect(
							chapter
						).toEqual({
							id:
								'publisher/kjvs/1_1',

							value:
								'chapter'
						});
					}
				);
			}
		);

		it(
			'returns the operation result after the transaction commits',
			async () => {
				const db =
					await createDatabase();

				const result =
					await db.runReadWriteTransaction(
						[
							CHAPTERS
						],
						async (tx) => {
							await tx.putValue(
								CHAPTERS,
								{
									id:
										'publisher/kjvs/1_1'
								}
							);

							return 'installed';
						}
					);

				expect(
					result
				).toBe(
					'installed'
				);

				expect(
					await db.getValue(
						CHAPTERS,
						'publisher/kjvs/1_1'
					)
				).toEqual({
					id:
						'publisher/kjvs/1_1'
				});
			}
		);
	}
);

async function createDatabase(): Promise<IndexedDB> {
	const databaseName =
		`idb-transaction-test-${crypto.randomUUID()}`;

	const db =
		new IndexedDB(
			databaseName
		);

	const opened =
		await db.createAndOrOpenObjectStores(
			[
				CHAPTERS,
				RESOURCE_INSTALLATIONS
			],
			1
		);

	expect(
		opened
	).toBe(
		true
	);

	return db;
}
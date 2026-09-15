import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	PlanProgress
} from '$lib/domains/reading-plans/models/plan-progress';

import type {
	PlanProgressWriteStores,
	PlanProgressWriteTransaction
} from '$lib/domains/reading-plans/resources/progress/plan-progress-write-stores';

import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

import {
	PlanProgressService
} from './plan-progress.service';

const SUBSCRIPTION_ID =
	'publisher/default/subscription-1';

const PUBLICATION:
	ResourcePublication = {
		type:
			'resource',

		publisher:
			'publisher',
		resourceType:
			'kjvonly/plans/progress',
		resourceId:
			'kjvonly/plans/progress/default/subscription-1',
		representation:
			'content',
		mediaType:
			'application/json+gzip+hex',
		value: {
			completedReadingIndexes: [
				0,
				2
			]
		}
	};

describe(
	'PlanProgressService',
	() => {
		it(
			'reads accepted local Plan Progress directly from the Domain store',
			async () => {
				const progress =
					createProgress([
						0
					]);

				const service =
					createService({
						get:
							vi.fn()
								.mockResolvedValue(
									progress
								),
						getAll:
							vi.fn()
								.mockResolvedValue([
									progress
								])
					});

				await expect(
					service.get(
						SUBSCRIPTION_ID
					)
				).resolves.toBe(
					progress
				);

				await expect(
					service.list()
				).resolves.toEqual([
					progress
				]);
			}
		);

		it(
			'atomically appends, sorts, publishes, and wakes after completing a reading',
			async () => {
				const existing =
					createProgress([
						2,
						0
					]);

				const events:
					string[] =
						[];

				const putProgress =
					vi.fn(
						async () => {
							events.push(
								'domain'
							);
						}
					);

				const putOutbox =
					vi.fn(
						async () => {
							events.push(
								'outbox'
							);
						}
					);

				const transaction:
					PlanProgressWriteTransaction = {
						run:
							async (
								operation
							) => {
								const result =
									await operation({
										progress: {
											get:
												async () =>
													existing,
											put:
												putProgress
										},
										outbox: {
											put:
												putOutbox
										}
									});

								events.push(
									'commit'
								);

								return result;
							}
					};

				const create =
					vi.fn()
						.mockReturnValue(
							PUBLICATION
						);

				const wake =
					vi.fn(
						() => {
							events.push(
								'wake'
							);
						}
					);

				const service =
					createService(
						{
							get:
								vi.fn(),
							getAll:
								vi.fn()
						},
						transaction,
						create,
						wake
					);

				const updated =
					await service.completeReading(
						SUBSCRIPTION_ID,
						1
					);

				expect(
					updated
				).toEqual({
					id:
						SUBSCRIPTION_ID,
					completedReadingIndexes: [
						0,
						1,
						2
					]
				});

				expect(
					create
				).toHaveBeenCalledWith(
					updated
				);

				expect(
					putProgress
				).toHaveBeenCalledWith(
					updated
				);

				expect(
					putOutbox
				).toHaveBeenCalledWith(
					SUBSCRIPTION_ID,
					PUBLICATION
				);

				expect(
					events
				).toEqual([
					'domain',
					'outbox',
					'commit',
					'wake'
				]);
			}
		);

		it(
			'creates progress when the subscription has no accepted progress yet',
			async () => {
				const transaction =
					createMemoryTransaction();

				const service =
					createService(
						{
							get:
								vi.fn(),
							getAll:
								vi.fn()
						},
						transaction
					);

				await expect(
					service.completeReading(
						SUBSCRIPTION_ID,
						3
					)
				).resolves.toEqual({
					id:
						SUBSCRIPTION_ID,
					completedReadingIndexes: [
						3
					]
				});
			}
		);

		it(
			'is idempotent when the reading index is already complete',
			async () => {
				const existing =
					createProgress([
						0,
						2
					]);

				const putProgress =
					vi.fn();
				const putOutbox =
					vi.fn();
				const create =
					vi.fn();
				const wake =
					vi.fn();

				const service =
					createService(
						{
							get:
								vi.fn(),
							getAll:
								vi.fn()
						},
						{
							run:
								async (
									operation
								) =>
									await operation({
										progress: {
											get:
												async () =>
													existing,
											put:
												putProgress
										},
										outbox: {
											put:
												putOutbox
										}
									})
						},
						create,
						wake
					);

				await expect(
					service.completeReading(
						SUBSCRIPTION_ID,
						2
					)
				).resolves.toBe(
					existing
				);

				expect(
					putProgress
				).not.toHaveBeenCalled();
				expect(
					putOutbox
				).not.toHaveBeenCalled();
				expect(
					create
				).not.toHaveBeenCalled();
				expect(
					wake
				).not.toHaveBeenCalled();
			}
		);

		it(
			'rejects an invalid reading index before opening the write transaction',
			async () => {
				const run =
					vi.fn();

				const service =
					createService(
						{
							get:
								vi.fn(),
							getAll:
								vi.fn()
						},
						{
							run
						} as unknown as PlanProgressWriteTransaction
					);

				await expect(
					service.completeReading(
						SUBSCRIPTION_ID,
						-1
					)
				).rejects.toThrow(
					'Invalid Plan reading index: -1'
				);

				expect(
					run
				).not.toHaveBeenCalled();
			}
		);

		it(
			'does not wake the Outbox when the atomic write fails',
			async () => {
				const error =
					new Error(
						'write failed'
					);

				const wake =
					vi.fn();

				const service =
					createService(
						{
							get:
								vi.fn(),
							getAll:
								vi.fn()
						},
						{
							run:
								async () => {
									throw error;
								}
						},
						vi.fn()
							.mockReturnValue(
								PUBLICATION
							),
						wake
					);

				await expect(
					service.completeReading(
						SUBSCRIPTION_ID,
						1
					)
				).rejects.toBe(
					error
				);

				expect(
					wake
				).not.toHaveBeenCalled();
			}
		);
	}
);

function createProgress(
	indexes: readonly number[]
): PlanProgress {
	return {
		id:
			SUBSCRIPTION_ID,
		completedReadingIndexes: [
			...indexes
		]
	};
}

function createService(
	store: {
		get:
			ReturnType<typeof vi.fn>;
		getAll:
			ReturnType<typeof vi.fn>;
	},
	writeTransaction:
		PlanProgressWriteTransaction =
			createMemoryTransaction(),
	create:
		ReturnType<typeof vi.fn> =
			vi.fn()
				.mockReturnValue(
					PUBLICATION
				),
	wake:
		ReturnType<typeof vi.fn> =
			vi.fn()
): PlanProgressService {
	return new PlanProgressService(
		store,
		writeTransaction,
		{
			create
		},
		{
			wake
		}
	);
}

function createMemoryTransaction():
	PlanProgressWriteTransaction {
	let progress:
		PlanProgress |
		undefined;

	return {
		run:
			async <T>(
				operation:
					(
						stores:
							PlanProgressWriteStores
					) => Promise<T>
			) =>
				await operation({
					progress: {
						get:
							async () =>
								progress,
						put:
							async (
								value
							) => {
								progress =
									value;
							}
					},
					outbox: {
						put:
							async () => {}
					}
				})
	};
}

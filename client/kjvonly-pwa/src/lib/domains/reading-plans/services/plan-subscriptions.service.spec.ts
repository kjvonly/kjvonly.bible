import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	PlanSubscription
} from '../models/plan-subscription';

import type {
	PlanSubscriptionWriteStores,
	PlanSubscriptionWriteTransaction
} from '../resources/subscriptions/plan-subscription-write-stores';

import type {
	ResourcePublication
} from '$lib/resource';

import {
	PlanSubscriptionsService
} from './plan-subscriptions.service';

const SUBSCRIPTION:
	PlanSubscription = {
		id:
			'publisher/default/subscription-1',
		planDefinitionId:
			'plan-publisher/default/mcheyne',
		name:
			'MCheyne',
		description:
			'Read through the Bible.',
		encodedReadings: [
			'1_1'
		],
		dateSubscribed:
			100
	};

const PUBLICATION:
	ResourcePublication = {
		type:
			'resource',

		publisher:
			'publisher',
		resourceType:
			'kjvonly/plans/subscriptions',
		resourceId:
			'kjvonly/plans/subscriptions/default/subscription-1',
		representation:
			'content',
		mediaType:
			'application/json+gzip+hex',
		value: {
			name:
				'MCheyne'
		}
	};

describe(
	'PlanSubscriptionsService',
	() => {
		it(
			'reads accepted local Plan Subscriptions directly from the Domain store',
			async () => {
				const get =
					vi.fn()
						.mockResolvedValue(
							SUBSCRIPTION
						);

				const getAll =
					vi.fn()
						.mockResolvedValue([
							SUBSCRIPTION
						]);

				const service =
					createService({
						get,
						getAll
					});

				await expect(
					service.get(
						SUBSCRIPTION.id
					)
				).resolves.toBe(
					SUBSCRIPTION
				);

				await expect(
					service.list()
				).resolves.toEqual([
					SUBSCRIPTION
				]);
			}
		);

		it(
			'commits the Plan Subscription and publication intent before waking the Outbox',
			async () => {
				const events:
					string[] =
						[];

				const putSubscription =
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
					PlanSubscriptionWriteTransaction = {
						run:
							async (
								operation
							) => {
								const result =
									await operation({
										subscriptions: {
											put:
												putSubscription
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

				const wake =
					vi.fn(
						() => {
							events.push(
								'wake'
							);
						}
					);

				const create =
					vi.fn()
						.mockReturnValue(
							PUBLICATION
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

				await service.put(
					SUBSCRIPTION
				);

				expect(
					create
				).toHaveBeenCalledWith(
					SUBSCRIPTION
				);

				expect(
					putSubscription
				).toHaveBeenCalledWith(
					SUBSCRIPTION
				);

				expect(
					putOutbox
				).toHaveBeenCalledWith(
					SUBSCRIPTION.id,
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
			'does not wake the Outbox when the atomic write fails',
			async () => {
				const error =
					new Error(
						'write failed'
					);

				const wake =
					vi.fn();

				const transaction:
					PlanSubscriptionWriteTransaction = {
						run:
							async () => {
								throw error;
							}
					};

				const service =
					createService(
						{
							get:
								vi.fn(),
							getAll:
								vi.fn()
						},
						transaction,
						vi.fn()
							.mockReturnValue(
								PUBLICATION
							),
						wake
					);

				await expect(
					service.put(
						SUBSCRIPTION
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

function createService(
	store: {
		get:
			ReturnType<typeof vi.fn>;
		getAll:
			ReturnType<typeof vi.fn>;
	},
	writeTransaction:
		PlanSubscriptionWriteTransaction =
			createNoopTransaction(),
	create:
		ReturnType<typeof vi.fn> =
			vi.fn()
				.mockReturnValue(
					PUBLICATION
				),
	wake:
		ReturnType<typeof vi.fn> =
			vi.fn()
): PlanSubscriptionsService {
	return new PlanSubscriptionsService(
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

function createNoopTransaction():
	PlanSubscriptionWriteTransaction {
	return {
		run:
			async <T>(
				operation:
					(
						stores:
							PlanSubscriptionWriteStores
					) => Promise<T>
			) =>
				await operation({
					subscriptions: {
						put:
							async () => {}
					},
					outbox: {
						put:
							async () => {}
					}
				})
	};
}

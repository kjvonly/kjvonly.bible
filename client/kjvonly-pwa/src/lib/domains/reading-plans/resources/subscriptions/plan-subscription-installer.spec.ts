import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PlanSubscription
} from '../../models/plan-subscription';

import {
	PLAN_SUBSCRIPTION_OBJECT_TYPE
} from '../../persistence/plan-subscriptions-store';

import {
	createResourceInstallationId,
	type DecodedResourceContent,
	type ResourceInstallation
} from '$lib/resource';

import type {
	PlanSubscriptionInstallationStores,
	PlanSubscriptionInstallationTransaction
} from './plan-subscription-installation-stores';

import {
	PlanSubscriptionInstaller
} from './plan-subscription-installer';

import type {
	ValidatedPlanSubscriptionCandidate
} from './validated-plan-subscription-candidate';

const SUBSCRIPTION_ID =
	'publisher/default/sub-1';

const RESOURCE_ID =
	'kjvonly/plans/subscriptions/default/sub-1';

describe(
	'PlanSubscriptionInstaller',
	() => {
		it(
			'installs a new Plan Subscription and Resource Installation',
			async () => {
				const transaction =
					new FakeTransaction();

				await new PlanSubscriptionInstaller(
					transaction
				).install(
					createResource(),
					[
						createCandidate()
					]
				);

				expect(
					transaction.subscriptions.get(
						SUBSCRIPTION_ID
					)
				).toEqual({
					id:
						SUBSCRIPTION_ID,
					planDefinitionId:
						'publisher/default/mcheyne',
					name:
						'My Plan',
					description:
						'Description',
					encodedReadings: [
						'1_1'
					],
					dateSubscribed:
						50
				});

				expect(
					transaction.resourceInstallations.get(
						createResourceInstallationId(
							PLAN_SUBSCRIPTION_OBJECT_TYPE,
							SUBSCRIPTION_ID
						)
					)
				).toMatchObject({
					publisher:
						'publisher',
					resourceId:
						RESOURCE_ID,
					modifiedAt:
						200
				});
			}
		);

		it(
			'replaces only when the incoming Resource is newer',
			async () => {
				for (
					const [
						modifiedAt,
						expectedName
					] of [
						[100, 'Current'],
						[200, 'Current'],
						[201, 'Incoming']
					] as const
				) {
					const transaction =
						new FakeTransaction();

					transaction.subscriptions.set(
						SUBSCRIPTION_ID,
						{
							...createSubscription(),
							name:
								'Current'
						}
					);

					transaction.resourceInstallations.set(
						createResourceInstallationId(
							PLAN_SUBSCRIPTION_OBJECT_TYPE,
							SUBSCRIPTION_ID
						),
						createInstallation()
					);

					await new PlanSubscriptionInstaller(
						transaction
					).install(
						createResource({
							modifiedAt
						}),
						[
							createCandidate({
								subscription: {
									...createCandidate().subscription,
									name:
										'Incoming'
								}
							})
						]
					);

					expect(
						transaction.subscriptions.get(
							SUBSCRIPTION_ID
						)?.name
					).toBe(
						expectedName
					);
				}
			}
		);
	}
);

function createResource(
	overrides:
		Partial<DecodedResourceContent> =
		{}
): DecodedResourceContent {
	return {
		publisher:
			'publisher',
		resourceId:
			RESOURCE_ID,
		resourceType:
			'kjvonly/plans/subscriptions',
		modifiedAt:
			200,
		mediaType:
			'application/json',
		value: {},
		...overrides
	};
}

function createCandidate(
	overrides:
		Partial<ValidatedPlanSubscriptionCandidate> =
		{}
): ValidatedPlanSubscriptionCandidate {
	return {
		group:
			'default',
		subscriptionId:
			'sub-1',
		subscription: {
			planDefinitionId:
				'publisher/default/mcheyne',
			name:
				'My Plan',
			description:
				'Description',
			encodedReadings: [
				'1_1'
			],
			dateSubscribed:
				50
		},
		...overrides
	};
}

function createSubscription(): PlanSubscription {
	return {
		id:
			SUBSCRIPTION_ID,
		...createCandidate().subscription
	};
}

function createInstallation(): ResourceInstallation {
	return {
		id:
			createResourceInstallationId(
				PLAN_SUBSCRIPTION_OBJECT_TYPE,
				SUBSCRIPTION_ID
			),
		objectType:
			PLAN_SUBSCRIPTION_OBJECT_TYPE,
		objectId:
			SUBSCRIPTION_ID,
		publisher:
			'publisher',
		resourceId:
			RESOURCE_ID,
		modifiedAt:
			200
	};
}

class FakeTransaction
	implements PlanSubscriptionInstallationTransaction {

	readonly subscriptions =
		new Map<string, PlanSubscription>();

	readonly resourceInstallations =
		new Map<string, ResourceInstallation>();

	async run<TResult>(
		operation:
			(
				stores:
					PlanSubscriptionInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		return await operation({
			subscriptions: {
				get:
					async (id) =>
						this.subscriptions.get(id),
				put:
					async (subscription) => {
						this.subscriptions.set(
							subscription.id,
							subscription
						);
					}
			},
			resourceInstallations: {
				get:
					async (
						objectType,
						objectId
					) =>
						this.resourceInstallations.get(
							createResourceInstallationId(
								objectType,
								objectId
							)
						),
				put:
					async (installation) => {
						this.resourceInstallations.set(
							installation.id,
							installation
						);
					}
			}
		});
	}
}

import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PlanSubscription
} from '$lib/domains/reading-plans/models/plan-subscription';

import {
	PlanSubscriptionResourcePublication
} from './plan-subscription-resource-publication';

import {
	PLAN_SUBSCRIPTION_RESOURCE_TYPE
} from './plan-subscription-resource-source';

describe(
	'PlanSubscriptionResourcePublication',
	() => {
		it(
			'derives the outbound Resource from the Plan Subscription Domain identity',
			() => {
				const publication =
					new PlanSubscriptionResourcePublication()
						.create(
							createSubscription()
						);

				expect(
					publication
				).toEqual({
					type:
						'resource',

					publisher:
						'publisher',
					resourceType:
						PLAN_SUBSCRIPTION_RESOURCE_TYPE,
					resourceId:
						`${PLAN_SUBSCRIPTION_RESOURCE_TYPE}/default/subscription-1`,
					representation:
						'content',
					mediaType:
						'application/json+gzip+hex',
					value: {
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
					}
				});
			}
		);

		it(
			'does not duplicate the subscription application id in Resource content',
			() => {
				const publication =
					new PlanSubscriptionResourcePublication()
						.create(
							createSubscription()
						);

				expect(
					publication.value
				).not.toHaveProperty(
					'id'
				);
			}
		);

		it(
			'rejects an invalid Plan Subscription application identity',
			() => {
				expect(
					() =>
						new PlanSubscriptionResourcePublication()
							.create({
								...createSubscription(),
								id:
									'subscription-1'
							})
				).toThrow(
					'Invalid Plan Subscription id: subscription-1'
				);
			}
		);
	}
);

function createSubscription(): PlanSubscription {
	return {
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
}

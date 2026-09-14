import {
	describe,
	expect,
	it
} from 'vitest';

import {
	PLAN_SUBSCRIPTION_RESOURCE_TYPE,
	createDefaultPlanSubscriptionSelection,
	createPlanSubscriptionIdForSource,
	parsePlanSubscriptionResourceSource
} from './plan-subscription-resource-source';

describe(
	'Plan Subscription Resource source',
	() => {
		it(
			'parses the selected subscription collection',
			() => {
				expect(
					parsePlanSubscriptionResourceSource({
						publisher:
							'publisher',
						resourceId:
							`${PLAN_SUBSCRIPTION_RESOURCE_TYPE}/study`
					})
				).toEqual({
					group:
						'study'
				});
			}
		);

		it(
			'creates the current-user default selection',
			() => {
				expect(
					createDefaultPlanSubscriptionSelection(
						'publisher'
					)
				).toEqual({
					publisher:
						'publisher',
					resourceId:
						`${PLAN_SUBSCRIPTION_RESOURCE_TYPE}/default`
				});
			}
		);

		it(
			'creates an application subscription id from the selected source',
			() => {
				expect(
					createPlanSubscriptionIdForSource(
						{
							publisher:
								'publisher',
							resourceId:
								`${PLAN_SUBSCRIPTION_RESOURCE_TYPE}/default`
						},
						'subscription-1'
					)
				).toBe(
					'publisher/default/subscription-1'
				);
			}
		);

		it(
			'rejects an individual subscription Resource as a selected source',
			() => {
				expect(
					() =>
						parsePlanSubscriptionResourceSource({
							publisher:
								'publisher',
							resourceId:
								`${PLAN_SUBSCRIPTION_RESOURCE_TYPE}/default/subscription-1`
						})
				).toThrow(
					'Invalid Plan Subscription Resource source'
				);
			}
		);
	}
);

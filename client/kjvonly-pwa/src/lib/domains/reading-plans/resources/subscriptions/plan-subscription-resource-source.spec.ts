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
							'kjvonly/reading-plans/plan-subscription/study'
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
						'kjvonly/reading-plans/plan-subscription/default'
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
								'kjvonly/reading-plans/plan-subscription/default'
						},
						'subscription-1'
					)
				).toBe(
					'publisher/default/subscription-1'
				);
			}
		);

		it(
			'rejects the historical Plan Subscription Resource ID',
			() => {
				expect(
					() =>
						parsePlanSubscriptionResourceSource({
							publisher:
								'publisher',
							resourceId:
								'kjvonly/plans/subscriptions/default'
						})
				).toThrow(
					'Invalid Plan Subscription Resource ID'
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
								'kjvonly/reading-plans/plan-subscription/default/subscription-1'
						})
				).toThrow(
					'Invalid Plan Subscription Resource source'
				);
			}
		);
	}
);

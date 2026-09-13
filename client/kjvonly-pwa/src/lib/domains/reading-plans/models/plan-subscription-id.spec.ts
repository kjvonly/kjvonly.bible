import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createPlanSubscriptionId,
	parsePlanSubscriptionId
} from './plan-subscription-id';

describe(
	'Plan Subscription identity',
	() => {
		it(
			'creates and parses the application identity',
			() => {
				const id =
					createPlanSubscriptionId(
						'publisher',
						'default',
						'subscription-1'
					);

				expect(
					id
				).toBe(
					'publisher/default/subscription-1'
				);

				expect(
					parsePlanSubscriptionId(
						id
					)
				).toEqual({
					publisher:
						'publisher',
					group:
						'default',
					subscriptionId:
						'subscription-1'
				});
			}
		);

		it(
			'rejects an invalid application identity',
			() => {
				expect(
					() =>
						parsePlanSubscriptionId(
							'publisher/subscription-1'
						)
				).toThrow(
					'Invalid Plan Subscription id: publisher/subscription-1'
				);
			}
		);
	}
);

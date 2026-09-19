import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PlanSubscriptionCandidate
} from './plan-subscription-candidate';

import {
	PlanSubscriptionValidator
} from './plan-subscription-validator';

describe(
	'PlanSubscriptionValidator',
	() => {
		it(
			'validates the canonical Plan Subscription payload',
			() => {
				expect(
					new PlanSubscriptionValidator()
						.validate(
							createCandidate()
						)
				).toEqual({
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
							'1/1/1-31'
						],
						dateSubscribed:
							50
					}
				});
			}
		);

		it(
			'rejects Domain identity in Resource content',
			() => {
				expect(
					() =>
						new PlanSubscriptionValidator()
							.validate(
								createCandidate({
									value: {
										...createValue(),
										id:
											'publisher/default/sub-1'
									}
								})
							)
				).toThrow();
			}
		);
	}
);

function createCandidate(
	overrides:
		Partial<PlanSubscriptionCandidate> =
		{}
): PlanSubscriptionCandidate {
	return {
		group:
			'default',
		subscriptionId:
			'sub-1',
		value:
			createValue(),
		...overrides
	};
}

function createValue(): Record<string, unknown> {
	return {
		planDefinitionId:
			'publisher/default/mcheyne',
		name:
			'My Plan',
		description:
			'Description',
		encodedReadings: [
			'1/1/1-31'
		],
		dateSubscribed:
			50
	};
}

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	PlanSubscriptionDataTypeHandler
} from './plan-subscription-data-type-handler';

import {
	PLAN_SUBSCRIPTION_DATA_TYPE,
	PLAN_SUBSCRIPTION_DATA_VERSION
} from './plan-subscription-resource-source';

describe(
	'PlanSubscriptionDataTypeHandler',
	() => {
		it(
			'exposes the semantic Resource contract',
			() => {
				expect(
					new PlanSubscriptionDataTypeHandler()
				).toMatchObject({
					dataType:
						PLAN_SUBSCRIPTION_DATA_TYPE,
					dataVersion:
						PLAN_SUBSCRIPTION_DATA_VERSION
				});
			}
		);

		it(
			'validates the existing Plan Subscription payload',
			() => {
				const value = {
					planDefinitionId:
						'publisher/default/mcheyne',
					name:
						'MCheyne',
					description:
						'',
					encodedReadings: [
						'1_1'
					],
					dateSubscribed:
						100
				};

				expect(
					new PlanSubscriptionDataTypeHandler()
						.validate(
							value
						)
				).toEqual(
					value
				);
			}
		);
	}
);

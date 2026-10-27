import {
	describe,
	expect,
	it
} from 'vitest';

import {
	PLAN_SUBSCRIPTION_OBJECT_TYPE
} from '../../persistence/plan-subscriptions-store';

import {
	PlanSubscriptionDomainObjectFactory
} from './plan-subscription-domain-object-factory';

import {
	PLAN_SUBSCRIPTION_DATA_TYPE,
	PLAN_SUBSCRIPTION_DATA_VERSION,
	PLAN_SUBSCRIPTION_RESOURCE_TYPE
} from './plan-subscription-resource-source';

describe(
	'PlanSubscriptionDomainObjectFactory',
	() => {
		it(
			'creates the canonical Plan Subscription Domain object',
			() => {
				const value = {
					planDefinitionId:
						'other/default/mcheyne',
					name:
						'MCheyne',
					description:
						'',
					encodedReadings:
						[],
					dateSubscribed:
						100
				};

				expect(
					new PlanSubscriptionDomainObjectFactory()
						.create(
							createContext(
								'kjvonly/reading-plans/plan-subscription/default/sub-1'
							),
							value
						)
				).toEqual([
					{
						objectType:
							PLAN_SUBSCRIPTION_OBJECT_TYPE,
						objectId:
							'publisher/default/sub-1',
						dataType:
							PLAN_SUBSCRIPTION_DATA_TYPE,
						dataVersion:
							1,
						value: {
							id:
								'publisher/default/sub-1',
							...value
						}
					}
				]);
			}
		);
	}
);

function createContext(
	resourceId: string
) {
	return {
		publisher:
			'publisher',
		resourceId,
		resourceType:
			PLAN_SUBSCRIPTION_RESOURCE_TYPE,
		dataType:
			PLAN_SUBSCRIPTION_DATA_TYPE,
		dataVersion:
			PLAN_SUBSCRIPTION_DATA_VERSION,
		modifiedAt:
			100,
		mediaType:
			'application/json'
	};
}

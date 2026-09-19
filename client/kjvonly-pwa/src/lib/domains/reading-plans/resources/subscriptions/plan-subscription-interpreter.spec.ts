import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource';

import {
	PlanSubscriptionInterpreter
} from './plan-subscription-interpreter';

import {
	PLAN_SUBSCRIPTION_RESOURCE_TYPE
} from './plan-subscription-resource-source';

describe(
	'PlanSubscriptionInterpreter',
	() => {
		it(
			'interprets one grouped Plan Subscription Resource',
			() => {
				const value = {
					name:
						'My Plan'
				};

				expect(
					Array.from(
						new PlanSubscriptionInterpreter()
							.interpret(
								createResource({
									value
								})
							)
					)
				).toEqual([
					{
						group:
							'default',
						subscriptionId:
							'sub-1',
						value
					}
				]);
			}
		);

		it(
			'rejects a mismatched Resource Type',
			() => {
				expect(
					() =>
						new PlanSubscriptionInterpreter()
							.interpret(
								createResource({
									resourceType:
										'kjvonly/plans/progress'
								})
							)
				).toThrow(
					'Invalid Plan Subscription Resource Type: kjvonly/plans/progress'
				);
			}
		);

		it.each([
			'kjvonly/plans/subscriptions',
			'kjvonly/plans/subscriptions/default',
			'kjvonly/plans/subscriptions/default/sub-1/extra'
		])(
			'rejects unsupported Resource path %s',
			(resourceId) => {
				expect(
					() =>
						new PlanSubscriptionInterpreter()
							.interpret(
								createResource({
									resourceId
								})
							)
				).toThrow(
					`Invalid Plan Subscription Resource path: ${resourceId}`
				);
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
			'kjvonly/plans/subscriptions/default/sub-1',
		resourceType:
			PLAN_SUBSCRIPTION_RESOURCE_TYPE,
		modifiedAt:
			100,
		mediaType:
			'application/json',
		value: {},
		...overrides
	};
}

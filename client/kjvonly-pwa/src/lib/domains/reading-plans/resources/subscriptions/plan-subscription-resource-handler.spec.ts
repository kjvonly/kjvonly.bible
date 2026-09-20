import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	DecodedResourceContent,
	ResourceInterpreter,
	ResourceValidator
} from '$lib/resource';

import type {
	PlanSubscriptionCandidate
} from './plan-subscription-candidate';

import {
	PlanSubscriptionResourceHandler,
	type PlanSubscriptionResourceInstaller
} from './plan-subscription-resource-handler';

import {
	PLAN_SUBSCRIPTION_RESOURCE_TYPE
} from './plan-subscription-resource-source';

import type {
	ValidatedPlanSubscriptionCandidate
} from './validated-plan-subscription-candidate';

describe(
	'PlanSubscriptionResourceHandler',
	() => {
		it(
			'interprets validates and installs a Plan Subscription Resource',
			async () => {
				const resource =
					createResource();

				const candidate:
					PlanSubscriptionCandidate = {
						group:
							'default',
						subscriptionId:
							'sub-1',
						value: {}
					};

				const validated:
					ValidatedPlanSubscriptionCandidate = {
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
							encodedReadings: [],
							dateSubscribed:
								50
						}
					};

				const interpreter = {
					resourceType:
						PLAN_SUBSCRIPTION_RESOURCE_TYPE,
					interpret:
						vi.fn(
							() => [candidate]
						)
				} satisfies ResourceInterpreter<PlanSubscriptionCandidate>;

				const validator = {
					validate:
						vi.fn(
							() => validated
						)
				} satisfies ResourceValidator<PlanSubscriptionCandidate, ValidatedPlanSubscriptionCandidate>;

				const installer = {
					install:
						vi.fn(
							async () => {}
						)
				} satisfies PlanSubscriptionResourceInstaller;

				await new PlanSubscriptionResourceHandler(
					interpreter,
					validator,
					installer
				).handle(
					resource
				);

				expect(
					interpreter.interpret
				).toHaveBeenCalledWith(
					resource
				);

				expect(
					validator.validate
				).toHaveBeenCalledWith(
					candidate
				);

				expect(
					installer.install
				).toHaveBeenCalledWith(
					resource,
					[validated]
				);
			}
		);
	}
);

function createResource(): DecodedResourceContent {
	return {
		publisher:
			'publisher',
		resourceId:
			'kjvonly/plans/subscriptions/default/sub-1',
		resourceType:
			PLAN_SUBSCRIPTION_RESOURCE_TYPE,
		modifiedAt:
			200,
		mediaType:
			'application/json',
		value: {}
	};
}

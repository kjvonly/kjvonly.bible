import {
	type ResourceDomainObjectCandidate,
	type ResourceDomainObjectFactory,
	type ResourceDomainObjectFactoryContext
} from '$lib/resource';

import type {
	PlanSubscription
} from '../../models/plan-subscription';

import {
	createPlanSubscriptionId
} from '../../models/plan-subscription-id';

import {
	PLAN_SUBSCRIPTION_OBJECT_TYPE
} from '../../persistence/plan-subscriptions-store';

import type {
	PlanSubscriptionResourceData
} from './plan-subscription-data-type-handler';

import {
	PLAN_SUBSCRIPTION_DATA_TYPE,
	PLAN_SUBSCRIPTION_DATA_VERSION,
	PLAN_SUBSCRIPTION_RESOURCE_TYPE,
	parsePlanSubscriptionResourceId
} from './plan-subscription-resource-source';

/** Gives a validated Plan Subscription Resource its accepted Domain identity. */
export class PlanSubscriptionDomainObjectFactory
	implements ResourceDomainObjectFactory {

	readonly resourceType =
		PLAN_SUBSCRIPTION_RESOURCE_TYPE;

	create(
		resource:
			ResourceDomainObjectFactoryContext,

		value: unknown
	): readonly ResourceDomainObjectCandidate[] {
		const {
			group,
			subscriptionId:
				resourceSubscriptionId
		} = parsePlanSubscriptionResourceId(
			resource.resourceId
		);

		if (
			resourceSubscriptionId === undefined
		) {
			throw new Error(
				`Invalid Plan Subscription Resource ID: ${resource.resourceId}`
			);
		}

		const id =
			createPlanSubscriptionId(
				resource.publisher,
				group,
				resourceSubscriptionId
			);

		const accepted =
			value as PlanSubscriptionResourceData;

		const subscription:
			PlanSubscription = {
				id,

				planDefinitionId:
					accepted.planDefinitionId,

				name:
					accepted.name,

				description:
					accepted.description,

				encodedReadings: [
					...accepted.encodedReadings
				],

				dateSubscribed:
					accepted.dateSubscribed
			};

		return [
			{
				objectType:
					PLAN_SUBSCRIPTION_OBJECT_TYPE,


				objectId:
					id,

				dataType:
					PLAN_SUBSCRIPTION_DATA_TYPE,

				dataVersion:
					PLAN_SUBSCRIPTION_DATA_VERSION,

				value:
					subscription
			}
		];
	}
}

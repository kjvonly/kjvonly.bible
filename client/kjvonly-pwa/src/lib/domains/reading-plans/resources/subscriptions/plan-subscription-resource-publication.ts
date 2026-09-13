import type {
	PlanSubscription
} from '$lib/domains/reading-plans/models/plan-subscription';

import {
	parsePlanSubscriptionId
} from '$lib/domains/reading-plans/models/plan-subscription-id';

import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

import {
	PLAN_SUBSCRIPTION_RESOURCE_TYPE
} from './plan-subscription-resource-source';

export class PlanSubscriptionResourcePublication {

	create(
		subscription: PlanSubscription
	): ResourcePublication {
		const {
			publisher,
			group,
			subscriptionId
		} = parsePlanSubscriptionId(
			subscription.id
		);

		return {
			publisher,

			resourceType:
				PLAN_SUBSCRIPTION_RESOURCE_TYPE,

			resourceId:
				`${PLAN_SUBSCRIPTION_RESOURCE_TYPE}/${group}/${subscriptionId}`,

			representation:
				'content',

			mediaType:
				'application/json+gzip+hex',

			value: {
				planDefinitionId:
					subscription.planDefinitionId,

				name:
					subscription.name,

				description:
					subscription.description,

				encodedReadings: [
					...subscription.encodedReadings
				],

				dateSubscribed:
					subscription.dateSubscribed
			}
		};
	}
}

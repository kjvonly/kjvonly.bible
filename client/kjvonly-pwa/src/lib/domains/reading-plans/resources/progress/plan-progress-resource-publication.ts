import type {
	PlanProgress
} from '$lib/domains/reading-plans/models/plan-progress';

import {
	parsePlanSubscriptionId
} from '$lib/domains/reading-plans/models/plan-subscription-id';

import type {
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

import {
	PLAN_PROGRESS_RESOURCE_TYPE
} from './plan-progress-resource';

export class PlanProgressResourcePublication {

	create(
		progress: PlanProgress
	): ResourcePublication {
		const {
			publisher,
			group,
			subscriptionId
		} = parsePlanSubscriptionId(
			progress.id
		);

		return {
			type:
				'resource',

			publisher,

			resourceType:
				PLAN_PROGRESS_RESOURCE_TYPE,

			resourceId:
				`${PLAN_PROGRESS_RESOURCE_TYPE}/${group}/${subscriptionId}`,

			representation:
				'content',

			mediaType:
				'application/json+gzip+hex',

			value: {
				completedReadingIndexes: [
					...progress.completedReadingIndexes
				]
			}
		};
	}
}

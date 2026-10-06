import type {
	PlanProgress
} from '../../models/plan-progress';

import {
	parsePlanSubscriptionId
} from '../../models/plan-subscription-id';

import type {
	ResourcePublication
} from '$lib/resource';

import {
	PLAN_PROGRESS_DATA_TYPE,
	PLAN_PROGRESS_DATA_VERSION,
	PLAN_PROGRESS_RESOURCE_TYPE,
	createPlanProgressResourceId
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

			dataType:
				PLAN_PROGRESS_DATA_TYPE,

			dataVersion:
				PLAN_PROGRESS_DATA_VERSION,

			resourceId:
				createPlanProgressResourceId(
					group,
					subscriptionId
				),

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

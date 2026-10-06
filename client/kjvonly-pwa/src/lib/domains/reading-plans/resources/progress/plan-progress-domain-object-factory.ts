import {
	type ResourceDomainObjectCandidate,
	type ResourceDomainObjectFactory,
	type ResourceDomainObjectFactoryContext
} from '$lib/resource';

import type {
	PlanProgress
} from '../../models/plan-progress';

import {
	createPlanSubscriptionId
} from '../../models/plan-subscription-id';

import {
	PLAN_PROGRESS_OBJECT_TYPE
} from '../../persistence/plan-progress-store';

import type {
	PlanProgressResourceData
} from './plan-progress-data-type-handler';

import {
	PLAN_PROGRESS_DATA_TYPE,
	PLAN_PROGRESS_DATA_VERSION,
	PLAN_PROGRESS_RESOURCE_TYPE,
	parsePlanProgressResourceId
} from './plan-progress-resource';

/** Gives a validated Plan Progress Resource its accepted Domain identity. */
export class PlanProgressDomainObjectFactory
	implements ResourceDomainObjectFactory {

	readonly resourceType =
		PLAN_PROGRESS_RESOURCE_TYPE;

	create(
		resource:
			ResourceDomainObjectFactoryContext,

		value: unknown
	): readonly ResourceDomainObjectCandidate[] {
		const {
			group,
			subscriptionId
		} = parsePlanProgressResourceId(
			resource.resourceId
		);

		const id =
			createPlanSubscriptionId(
				resource.publisher,
				group,
				subscriptionId
			);

		const accepted =
			value as PlanProgressResourceData;

		const progress:
			PlanProgress = {
				id,

				completedReadingIndexes: [
					...accepted.completedReadingIndexes
				]
			};

		return [
			{
				objectType:
					PLAN_PROGRESS_OBJECT_TYPE,


				objectId:
					id,

				dataType:
					PLAN_PROGRESS_DATA_TYPE,

				dataVersion:
					PLAN_PROGRESS_DATA_VERSION,

				value:
					progress
			}
		];
	}
}

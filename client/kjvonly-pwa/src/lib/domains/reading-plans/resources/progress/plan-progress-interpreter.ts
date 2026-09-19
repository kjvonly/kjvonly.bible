import type {
	DecodedResourceContent,
	ResourceInterpreter
} from '$lib/resource';

import {
	parseResourceIdentifier
} from '$lib/resource';

import type {
	PlanProgressCandidate
} from './plan-progress-candidate';

import {
	PLAN_PROGRESS_RESOURCE_TYPE
} from './plan-progress-resource';

export class PlanProgressInterpreter
	implements ResourceInterpreter<
		PlanProgressCandidate
	> {

	readonly resourceType =
		PLAN_PROGRESS_RESOURCE_TYPE;

	interpret(
		resource:
			DecodedResourceContent
	): Iterable<PlanProgressCandidate> {
		if (
			resource.resourceType !==
			this.resourceType
		) {
			throw new Error(
				`Invalid Plan Progress Resource Type: ${resource.resourceType}`
			);
		}

		const identifier =
			parseResourceIdentifier(
				resource.resourceId
			);

		if (
			identifier.resourceType !==
			this.resourceType
		) {
			throw new Error(
				`Invalid Plan Progress Resource Identifier: ${resource.resourceId}`
			);
		}

		if (
			identifier.path.length !==
			2
		) {
			throw new Error(
				`Invalid Plan Progress Resource path: ${resource.resourceId}`
			);
		}

		const [
			group,
			subscriptionId
		] = identifier.path;

		return [
			{
				group,
				subscriptionId,
				value:
					resource.value
			}
		];
	}
}

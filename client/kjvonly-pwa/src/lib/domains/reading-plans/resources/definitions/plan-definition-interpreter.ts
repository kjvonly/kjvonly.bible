import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceInterpreter
} from '$lib/resource/interpretation/resource-interpreter';

import {
	parseResourceIdentifier
} from '$lib/resource/utils/resource-identifier';

import type {
	PlanDefinitionCandidate
} from './plan-definition-candidate';

export const PLAN_DEFINITION_RESOURCE_TYPE =
	'kjvonly/plans/readings';

export class PlanDefinitionInterpreter
	implements ResourceInterpreter<
		PlanDefinitionCandidate
	> {

	readonly resourceType =
		PLAN_DEFINITION_RESOURCE_TYPE;

	interpret(
		resource:
			DecodedResourceContent
	): Iterable<PlanDefinitionCandidate> {
		if (
			resource.resourceType !==
			this.resourceType
		) {
			throw new Error(
				`Invalid Plan Definition Resource Type: ${resource.resourceType}`
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
				`Invalid Plan Definition Resource Identifier: ${resource.resourceId}`
			);
		}

		if (
			identifier.path.length !==
			2
		) {
			throw new Error(
				`Invalid Plan Definition Resource path: ${resource.resourceId}`
			);
		}

		const [
			group,
			planKey
		] = identifier.path;

		return [
			{
				group,
				planKey,
				value:
					resource.value
			}
		];
	}
}

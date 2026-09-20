import type {
	PlanDefinition
} from '$lib/domains/reading-plans/models/plan-definition';

import {
	parsePlanDefinitionId
} from '$lib/domains/reading-plans/models/plan-definition-id';

import type {
	ResourcePublication
} from '$lib/resource';

import {
	PLAN_DEFINITION_RESOURCE_TYPE
} from './plan-definition-interpreter';

export class PlanDefinitionResourcePublication {

	create(
		definition: PlanDefinition
	): ResourcePublication {
		const {
			publisher,
			group,
			planKey
		} = parsePlanDefinitionId(
			definition.id
		);

		return {
			type:
				'resource',

			publisher,

			resourceType:
				PLAN_DEFINITION_RESOURCE_TYPE,

			resourceId:
				`${PLAN_DEFINITION_RESOURCE_TYPE}/${group}/${planKey}`,

			representation:
				'content',

			mediaType:
				'application/json+gzip+hex',

			value: {
				name:
					definition.name,

				description:
					definition.description,

				encodedReadings: [
					...definition.encodedReadings
				]
			}
		};
	}
}

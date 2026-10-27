import type {
	PlanDefinition
} from '../../models/plan-definition';

import {
	parsePlanDefinitionId
} from '../../models/plan-definition-id';

import type {
	ResourcePublication
} from '$lib/resource';

import {
	PLAN_DEFINITION_DATA_TYPE,
	PLAN_DEFINITION_DATA_VERSION,
	PLAN_DEFINITION_RESOURCE_TYPE,
	createPlanDefinitionResourceId
} from './plan-definition-resource';

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

			dataType:
				PLAN_DEFINITION_DATA_TYPE,

			dataVersion:
				PLAN_DEFINITION_DATA_VERSION,

			resourceId:
				createPlanDefinitionResourceId(
					group,
					planKey
				),

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

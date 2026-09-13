import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import {
	PLAN_DEFINITION_RESOURCE_TYPE
} from './plan-definition-interpreter';

export const DEFAULT_PLAN_DEFINITION_RESOURCE_GROUP =
	'default';

export function createDefaultPlanDefinitionSelection(
	publisher: string
): PublishedResourceReference {
	return {
		publisher,

		resourceId:
			`${PLAN_DEFINITION_RESOURCE_TYPE}/${DEFAULT_PLAN_DEFINITION_RESOURCE_GROUP}`
	};
}

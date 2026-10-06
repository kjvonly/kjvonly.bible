import type {
	PublishedResourceReference
} from '$lib/resource';

import {
	createPlanDefinitionResourceId
} from './plan-definition-resource';

export const DEFAULT_PLAN_DEFINITION_RESOURCE_GROUP =
	'default';

export function createDefaultPlanDefinitionSelection(
	publisher: string
): PublishedResourceReference {
	return {
		publisher,

		resourceId:
			createPlanDefinitionResourceId(
				DEFAULT_PLAN_DEFINITION_RESOURCE_GROUP
			)
	};
}

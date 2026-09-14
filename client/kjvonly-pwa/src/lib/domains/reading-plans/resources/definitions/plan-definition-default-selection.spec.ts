import {
	describe,
	expect,
	it
} from 'vitest';

import {
	PLAN_DEFINITION_RESOURCE_TYPE
} from './plan-definition-interpreter';

import {
	createDefaultPlanDefinitionSelection,
	DEFAULT_PLAN_DEFINITION_RESOURCE_GROUP
} from './plan-definition-default-selection';

describe(
	'createDefaultPlanDefinitionSelection',
	() => {
		it(
			'creates the current user default Plan Definition Resource source',
			() => {
				expect(
					createDefaultPlanDefinitionSelection(
						'user-pubkey'
					)
				).toEqual({
					publisher:
						'user-pubkey',

					resourceId:
						`${PLAN_DEFINITION_RESOURCE_TYPE}/${DEFAULT_PLAN_DEFINITION_RESOURCE_GROUP}`
				});
			}
		);
	}
);

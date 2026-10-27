import {
	describe,
	expect,
	it
} from 'vitest';

import {
	PlanDefinitionDataTypeHandler
} from './plan-definition-data-type-handler';

import {
	PLAN_DEFINITION_DATA_TYPE,
	PLAN_DEFINITION_DATA_VERSION
} from './plan-definition-resource';

describe(
	'PlanDefinitionDataTypeHandler',
	() => {
		it(
			'exposes the semantic Resource contract',
			() => {
				expect(
					new PlanDefinitionDataTypeHandler()
				).toMatchObject({
					dataType:
						PLAN_DEFINITION_DATA_TYPE,
					dataVersion:
						PLAN_DEFINITION_DATA_VERSION
				});
			}
		);

		it(
			'validates the existing Plan Definition payload',
			() => {
				const value = {
					name:
						'MCheyne',
					description:
						'Annual plan',
					encodedReadings: [
						'1_1',
						'40_1'
					]
				};

				expect(
					new PlanDefinitionDataTypeHandler()
						.validate(
							value
						)
				).toEqual(
					value
				);
			}
		);

		it(
			'rejects Domain identity inside the semantic Resource payload',
			() => {
				expect(
					() =>
						new PlanDefinitionDataTypeHandler()
							.validate({
								id:
									'publisher/default/mcheyne',
								name:
									'MCheyne',
								description:
									'',
								encodedReadings:
									[]
							})
				).toThrow();
			}
		);
	}
);

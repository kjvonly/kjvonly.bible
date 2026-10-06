import {
	describe,
	expect,
	it
} from 'vitest';

import {
	PLAN_DEFINITION_OBJECT_TYPE
} from '../../persistence/plan-definitions-store';

import {
	PlanDefinitionDomainObjectFactory
} from './plan-definition-domain-object-factory';

import {
	PLAN_DEFINITION_DATA_TYPE,
	PLAN_DEFINITION_DATA_VERSION,
	PLAN_DEFINITION_RESOURCE_TYPE
} from './plan-definition-resource';

describe(
	'PlanDefinitionDomainObjectFactory',
	() => {
		it(
			'creates the canonical Plan Definition Domain object',
			() => {
				const value = {
					name:
						'MCheyne',
					description:
						'Annual plan',
					encodedReadings: [
						'1_1'
					]
				};

				expect(
					new PlanDefinitionDomainObjectFactory()
						.create(
							createContext(
								'kjvonly/reading-plans/plan-definition/default/mcheyne'
							),
							value
						)
				).toEqual([
					{
						objectType:
							PLAN_DEFINITION_OBJECT_TYPE,
						objectId:
							'publisher/default/mcheyne',
						dataType:
							PLAN_DEFINITION_DATA_TYPE,
						dataVersion:
							1,
						value: {
							id:
								'publisher/default/mcheyne',
							...value
						}
					}
				]);
			}
		);

		it(
			'rejects the historical Plan Definition Resource ID',
			() => {
				expect(
					() =>
						new PlanDefinitionDomainObjectFactory()
							.create(
								createContext(
									'kjvonly/plans/readings/default/mcheyne'
								),
								{
									name: 'Plan',
									description: '',
									encodedReadings: []
								}
							)
				).toThrow(
					'Invalid Plan Definition Resource ID'
				);
			}
		);

		it(
			'rejects an invalid Plan Definition Resource path',
			() => {
				expect(
					() =>
						new PlanDefinitionDomainObjectFactory()
							.create(
								createContext(
									'kjvonly/reading-plans/plan-definition/default'
								),
								{
									name: 'Plan',
									description: '',
									encodedReadings: []
								}
							)
				).toThrow();
			}
		);
	}
);

function createContext(
	resourceId: string
) {
	return {
		publisher:
			'publisher',
		resourceId,
		resourceType:
			PLAN_DEFINITION_RESOURCE_TYPE,
		dataType:
			PLAN_DEFINITION_DATA_TYPE,
		dataVersion:
			PLAN_DEFINITION_DATA_VERSION,
		modifiedAt:
			100,
		mediaType:
			'application/json'
	};
}

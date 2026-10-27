import {
	describe,
	expect,
	it
} from 'vitest';

import {
	PLAN_PROGRESS_OBJECT_TYPE
} from '../../persistence/plan-progress-store';

import {
	PlanProgressDomainObjectFactory
} from './plan-progress-domain-object-factory';

import {
	PLAN_PROGRESS_DATA_TYPE,
	PLAN_PROGRESS_DATA_VERSION,
	PLAN_PROGRESS_RESOURCE_TYPE
} from './plan-progress-resource';

describe(
	'PlanProgressDomainObjectFactory',
	() => {
		it(
			'creates the canonical Plan Progress Domain object',
			() => {
				const value = {
					completedReadingIndexes: [
						0,
						2
					]
				};

				expect(
					new PlanProgressDomainObjectFactory()
						.create(
							createContext(
								'kjvonly/reading-plans/plan-progress/default/sub-1'
							),
							value
						)
				).toEqual([
					{
						objectType:
							PLAN_PROGRESS_OBJECT_TYPE,
						objectId:
							'publisher/default/sub-1',
						dataType:
							PLAN_PROGRESS_DATA_TYPE,
						dataVersion:
							1,
						value: {
							id:
								'publisher/default/sub-1',
							...value
						}
					}
				]);
			}
		);

		it(
			'rejects the historical Plan Progress Resource ID',
			() => {
				expect(
					() =>
						new PlanProgressDomainObjectFactory()
							.create(
								createContext(
									'kjvonly/plans/progress/default/sub-1'
								),
								{
									completedReadingIndexes: []
								}
							)
				).toThrow(
					'Invalid Plan Progress Resource ID'
				);
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
			PLAN_PROGRESS_RESOURCE_TYPE,
		dataType:
			PLAN_PROGRESS_DATA_TYPE,
		dataVersion:
			PLAN_PROGRESS_DATA_VERSION,
		modifiedAt:
			100,
		mediaType:
			'application/json'
	};
}

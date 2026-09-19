import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource';

import {
	PlanProgressInterpreter
} from './plan-progress-interpreter';

import {
	PLAN_PROGRESS_RESOURCE_TYPE
} from './plan-progress-resource';

describe(
	'PlanProgressInterpreter',
	() => {
		it(
			'interprets one grouped Plan Progress Resource',
			() => {
				const value = {
					completedReadingIndexes: [
						0,
						2
					]
				};

				expect(
					Array.from(
						new PlanProgressInterpreter()
							.interpret(
								createResource({
									value
								})
							)
					)
				).toEqual([
					{
						group:
							'default',
						subscriptionId:
							'sub-1',
						value
					}
				]);
			}
		);

		it(
			'rejects a mismatched Resource Type',
			() => {
				expect(
					() =>
						new PlanProgressInterpreter()
							.interpret(
								createResource({
									resourceType:
										'kjvonly/plans/subscriptions'
								})
							)
				).toThrow(
					'Invalid Plan Progress Resource Type: kjvonly/plans/subscriptions'
				);
			}
		);

		it.each([
			'kjvonly/plans/progress',
			'kjvonly/plans/progress/default',
			'kjvonly/plans/progress/default/sub-1/extra'
		])(
			'rejects unsupported Resource path %s',
			(resourceId) => {
				expect(
					() =>
						new PlanProgressInterpreter()
							.interpret(
								createResource({
									resourceId
								})
							)
				).toThrow(
					`Invalid Plan Progress Resource path: ${resourceId}`
				);
			}
		);
	}
);

function createResource(
	overrides:
		Partial<DecodedResourceContent> =
		{}
): DecodedResourceContent {
	return {
		publisher:
			'publisher',
		resourceId:
			'kjvonly/plans/progress/default/sub-1',
		resourceType:
			PLAN_PROGRESS_RESOURCE_TYPE,
		modifiedAt:
			100,
		mediaType:
			'application/json',
		value: {},
		...overrides
	};
}

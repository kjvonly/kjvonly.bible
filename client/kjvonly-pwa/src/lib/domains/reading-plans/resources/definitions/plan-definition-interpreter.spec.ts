import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import {
	PLAN_DEFINITION_RESOURCE_TYPE,
	PlanDefinitionInterpreter
} from './plan-definition-interpreter';

describe(
	'PlanDefinitionInterpreter',
	() => {
		it(
			'uses the Plan Definition Resource Type',
			() => {
				expect(
					new PlanDefinitionInterpreter()
						.resourceType
				).toBe(
					'kjvonly/plans/readings'
				);
			}
		);

		it(
			'interprets one grouped Plan Definition Resource',
			() => {
				const value = {
					name:
						'MCheyne'
				};

				const candidates =
					Array.from(
						new PlanDefinitionInterpreter()
							.interpret(
								createResource({
									value
								})
							)
					);

				expect(
					candidates
				).toEqual([
					{
						group:
							'default',
						planKey:
							'mcheyne',
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
						new PlanDefinitionInterpreter()
							.interpret(
								createResource({
									resourceType:
										'kjvonly/notes/entries'
								})
							)
				).toThrow(
					'Invalid Plan Definition Resource Type: kjvonly/notes/entries'
				);
			}
		);

		it(
			'rejects a Resource Identifier from another Resource Type',
			() => {
				expect(
					() =>
						new PlanDefinitionInterpreter()
							.interpret(
								createResource({
									resourceId:
										'kjvonly/notes/entries/default/mcheyne'
								})
							)
				).toThrow(
					'Invalid Plan Definition Resource Identifier: kjvonly/notes/entries/default/mcheyne'
				);
			}
		);

		it.each([
			'kjvonly/plans/readings',
			'kjvonly/plans/readings/default',
			'kjvonly/plans/readings/default/mcheyne/extra'
		])(
			'rejects unsupported Resource path %s',
			(resourceId) => {
				expect(
					() =>
						new PlanDefinitionInterpreter()
							.interpret(
								createResource({
									resourceId
								})
							)
				).toThrow(
					`Invalid Plan Definition Resource path: ${resourceId}`
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
			'a'.repeat(64),

		resourceId:
			'kjvonly/plans/readings/default/mcheyne',

		resourceType:
			PLAN_DEFINITION_RESOURCE_TYPE,

		modifiedAt:
			100,

		mediaType:
			'application/json',

		value: {
			name:
				'MCheyne',
			description:
				'Description',
			encodedReadings: [
				'1/1/1-31'
			]
		},

		...overrides
	};
}

import {
	z
} from 'zod';

import type {
	ResourceDataTypeHandler
} from '$lib/resource';

import {
	PLAN_DEFINITION_DATA_TYPE,
	PLAN_DEFINITION_DATA_VERSION
} from './plan-definition-resource';

const planDefinitionSchema =
	z.object({
		name:
			z.string()
				.min(1),

		description:
			z.string(),

		encodedReadings:
			z.array(
				z.string()
					.min(1)
			)
	})
		.strict();

export interface PlanDefinitionResourceData {
	readonly name:
		string;

	readonly description:
		string;

	readonly encodedReadings:
		readonly string[];
}

/** Validates the published Plan Definition Resource payload contract. */
export class PlanDefinitionDataTypeHandler
	implements ResourceDataTypeHandler<PlanDefinitionResourceData> {

	readonly dataType =
		PLAN_DEFINITION_DATA_TYPE;

	readonly dataVersion =
		PLAN_DEFINITION_DATA_VERSION;

	validate(
		value: unknown
	): PlanDefinitionResourceData {
		return validatePlanDefinition(
			value
		);
	}
}


function validatePlanDefinition(
	value: unknown
): PlanDefinitionResourceData {
	const definition =
		planDefinitionSchema.parse(
			value
		);

	return {
		name:
			definition.name,

		description:
			definition.description,

		encodedReadings: [
			...definition.encodedReadings
		]
	};
}

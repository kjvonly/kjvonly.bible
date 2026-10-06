import {
	z
} from 'zod';

import type {
	ResourceDataTypeHandler
} from '$lib/resource';

import {
	PLAN_PROGRESS_DATA_TYPE,
	PLAN_PROGRESS_DATA_VERSION
} from './plan-progress-resource';

const planProgressSchema =
	z.object({
		completedReadingIndexes:
			z.array(
				z.number()
					.int()
					.nonnegative()
					.refine(
						Number.isSafeInteger,
						'Plan reading index must be a safe integer'
					)
			)
	})
		.strict();

export interface PlanProgressResourceData {
	readonly completedReadingIndexes:
		readonly number[];
}

/** Validates the published Plan Progress Resource payload contract. */
export class PlanProgressDataTypeHandler
	implements ResourceDataTypeHandler<PlanProgressResourceData> {

	readonly dataType =
		PLAN_PROGRESS_DATA_TYPE;

	readonly dataVersion =
		PLAN_PROGRESS_DATA_VERSION;

	validate(
		value: unknown
	): PlanProgressResourceData {
		return validatePlanProgress(
			value
		);
	}
}


function validatePlanProgress(
	value: unknown
): PlanProgressResourceData {
	const progress =
		planProgressSchema.parse(
			value
		);

	return {
		completedReadingIndexes: [
			...progress.completedReadingIndexes
		]
	};
}

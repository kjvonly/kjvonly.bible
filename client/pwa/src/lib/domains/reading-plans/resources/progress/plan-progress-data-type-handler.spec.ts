import {
	describe,
	expect,
	it
} from 'vitest';

import {
	PlanProgressDataTypeHandler
} from './plan-progress-data-type-handler';

import {
	PLAN_PROGRESS_DATA_TYPE,
	PLAN_PROGRESS_DATA_VERSION
} from './plan-progress-resource';

describe(
	'PlanProgressDataTypeHandler',
	() => {
		it(
			'exposes the semantic Resource contract',
			() => {
				expect(
					new PlanProgressDataTypeHandler()
				).toMatchObject({
					dataType:
						PLAN_PROGRESS_DATA_TYPE,
					dataVersion:
						PLAN_PROGRESS_DATA_VERSION
				});
			}
		);

		it(
			'validates safe nonnegative completed reading indexes',
			() => {
				const value = {
					completedReadingIndexes: [
						0,
						2,
						4
					]
				};

				expect(
					new PlanProgressDataTypeHandler()
						.validate(
							value
						)
				).toEqual(
					value
				);
			}
		);

		it(
			'rejects an unsafe reading index',
			() => {
				expect(
					() =>
						new PlanProgressDataTypeHandler()
							.validate({
								completedReadingIndexes: [
									Number.MAX_SAFE_INTEGER + 1
								]
							})
				).toThrow();
			}
		);
	}
);

import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PlanDefinitionCandidate
} from './plan-definition-candidate';

import {
	PlanDefinitionValidator
} from './plan-definition-validator';

describe(
	'PlanDefinitionValidator',
	() => {
		it(
			'validates the canonical Plan Definition payload',
			() => {
				const validator =
					new PlanDefinitionValidator();

				expect(
					validator.validate(
						createCandidate()
					)
				).toEqual({
					group:
						'default',
					planKey:
						'mcheyne',
					definition: {
						name:
							'MCheyne',
						description:
							'Description',
						encodedReadings: [
							'1/1/1-31',
							'40/1/1-25'
						]
					}
				});
			}
		);

		it.each([
			'id',
			'userID',
			'version',
			'dateCreated'
		])(
			'rejects legacy field %s',
			(field) => {
				const value =
					createValue();

				value[field] =
					field ===
						'version' ||
					field ===
						'dateCreated'
						? 1
						: 'legacy';

				expect(
					() =>
						new PlanDefinitionValidator()
							.validate(
								createCandidate({
									value
								})
							)
				).toThrow();
			}
		);

		it(
			'rejects an empty Plan name',
			() => {
				expect(
					() =>
						new PlanDefinitionValidator()
							.validate(
								createCandidate({
									value: {
										...createValue(),
										name:
											''
									}
								})
							)
				).toThrow();
			}
		);

		it(
			'rejects non-string encoded readings',
			() => {
				expect(
					() =>
						new PlanDefinitionValidator()
							.validate(
								createCandidate({
									value: {
										...createValue(),
										encodedReadings: [
											1
										]
									}
								})
							)
				).toThrow();
			}
		);
	}
);

function createCandidate(
	overrides:
		Partial<PlanDefinitionCandidate> =
		{}
): PlanDefinitionCandidate {
	return {
		group:
			'default',

		planKey:
			'mcheyne',

		value:
			createValue(),

		...overrides
	};
}

function createValue(): Record<string, unknown> {
	return {
		name:
			'MCheyne',

		description:
			'Description',

		encodedReadings: [
			'1/1/1-31',
			'40/1/1-25'
		]
	};
}

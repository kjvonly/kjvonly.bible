import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PlanProgressCandidate
} from './plan-progress-candidate';

import {
	PlanProgressValidator
} from './plan-progress-validator';

describe(
	'PlanProgressValidator',
	() => {
		it(
			'validates the canonical Plan Progress payload',
			() => {
				expect(
					new PlanProgressValidator()
						.validate(
							createCandidate()
						)
				).toEqual({
					group:
						'default',
					subscriptionId:
						'sub-1',
					progress: {
						completedReadingIndexes: [
							0,
							2
						]
					}
				});
			}
		);

		it(
			'rejects Domain identity in Resource content',
			() => {
				expect(
					() =>
						new PlanProgressValidator()
							.validate(
								createCandidate({
									value: {
										...createValue(),
										id:
											'publisher/default/sub-1'
									}
								})
							)
				).toThrow();
			}
		);

		it.each([
			-1,
			1.5,
			Number.MAX_SAFE_INTEGER + 1
		])(
			'rejects invalid completed reading index %s',
			(readingIndex) => {
				expect(
					() =>
						new PlanProgressValidator()
							.validate(
								createCandidate({
									value: {
										completedReadingIndexes: [
											readingIndex
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
		Partial<PlanProgressCandidate> =
		{}
): PlanProgressCandidate {
	return {
		group:
			'default',
		subscriptionId:
			'sub-1',
		value:
			createValue(),
		...overrides
	};
}

function createValue(): Record<string, unknown> {
	return {
		completedReadingIndexes: [
			0,
			2
		]
	};
}

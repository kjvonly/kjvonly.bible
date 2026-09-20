import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	DecodedResourceContent,
	ResourceInterpreter,
	ResourceValidator
} from '$lib/resource';

import type {
	PlanProgressCandidate
} from './plan-progress-candidate';

import {
	PlanProgressResourceHandler,
	type PlanProgressResourceInstaller
} from './plan-progress-resource-handler';

import {
	PLAN_PROGRESS_RESOURCE_TYPE
} from './plan-progress-resource';

import type {
	ValidatedPlanProgressCandidate
} from './validated-plan-progress-candidate';

describe(
	'PlanProgressResourceHandler',
	() => {
		it(
			'interprets validates and installs a Plan Progress Resource',
			async () => {
				const resource =
					createResource();

				const candidate:
					PlanProgressCandidate = {
						group:
							'default',
						subscriptionId:
							'sub-1',
						value: {}
					};

				const validated:
					ValidatedPlanProgressCandidate = {
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
					};

				const interpreter = {
					resourceType:
						PLAN_PROGRESS_RESOURCE_TYPE,
					interpret:
						vi.fn(
							() => [candidate]
						)
				} satisfies ResourceInterpreter<PlanProgressCandidate>;

				const validator = {
					validate:
						vi.fn(
							() => validated
						)
				} satisfies ResourceValidator<PlanProgressCandidate, ValidatedPlanProgressCandidate>;

				const installer = {
					install:
						vi.fn(
							async () => {}
						)
				} satisfies PlanProgressResourceInstaller;

				await new PlanProgressResourceHandler(
					interpreter,
					validator,
					installer
				).handle(
					resource
				);

				expect(
					interpreter.interpret
				).toHaveBeenCalledWith(
					resource
				);

				expect(
					validator.validate
				).toHaveBeenCalledWith(
					candidate
				);

				expect(
					installer.install
				).toHaveBeenCalledWith(
					resource,
					[validated]
				);
			}
		);
	}
);

function createResource(): DecodedResourceContent {
	return {
		publisher:
			'publisher',
		resourceId:
			'kjvonly/plans/progress/default/sub-1',
		resourceType:
			PLAN_PROGRESS_RESOURCE_TYPE,
		modifiedAt:
			200,
		mediaType:
			'application/json',
		value: {}
	};
}

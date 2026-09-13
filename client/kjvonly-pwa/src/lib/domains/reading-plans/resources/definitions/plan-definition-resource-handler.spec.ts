import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceInterpreter
} from '$lib/resource/interpretation/resource-interpreter';

import type {
	ResourceValidator
} from '$lib/resource/validation/resource-validator';

import type {
	PlanDefinitionCandidate
} from './plan-definition-candidate';

import type {
	ValidatedPlanDefinitionCandidate
} from './validated-plan-definition-candidate';

import {
	PLAN_DEFINITION_RESOURCE_TYPE
} from './plan-definition-interpreter';

import {
	PlanDefinitionResourceHandler,
	type PlanDefinitionResourceInstaller
} from './plan-definition-resource-handler';

describe(
	'PlanDefinitionResourceHandler',
	() => {
		it(
			'interprets validates and installs a Plan Definition Resource',
			async () => {
				const interpreter =
					new FakeInterpreter();

				const validator =
					new FakeValidator();

				const installer =
					new FakeInstaller();

				const handler =
					new PlanDefinitionResourceHandler(
						interpreter,
						validator,
						installer
					);

				const resource =
					createResource();

				await handler.handle(
					resource
				);

				expect(
					interpreter.resource
				).toBe(
					resource
				);

				expect(
					validator.candidate
				).toEqual(
					createCandidate()
				);

				expect(
					installer.resource
				).toBe(
					resource
				);

				expect(
					installer.candidates
				).toEqual([
					createValidatedCandidate()
				]);
			}
		);

		it(
			'does not install when validation fails',
			async () => {
				const installer =
					new FakeInstaller();

				const handler =
					new PlanDefinitionResourceHandler(
						new FakeInterpreter(),
						new ThrowingValidator(),
						installer
					);

				await expect(
					handler.handle(
						createResource()
					)
				).rejects.toThrow(
					'validation failed'
				);

				expect(
					installer.installCount
				).toBe(
					0
				);
			}
		);

		it(
			'exposes the Plan Definition Resource Type',
			() => {
				const handler =
					new PlanDefinitionResourceHandler(
						new FakeInterpreter(),
						new FakeValidator(),
						new FakeInstaller()
					);

				expect(
					handler.resourceType
				).toBe(
					PLAN_DEFINITION_RESOURCE_TYPE
				);
			}
		);
	}
);

function createResource():
	DecodedResourceContent {
	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/plans/readings/default/mcheyne',

		resourceType:
			PLAN_DEFINITION_RESOURCE_TYPE,

		modifiedAt:
			200,

		mediaType:
			'application/json',

		value: {}
	};
}

function createCandidate():
	PlanDefinitionCandidate {
	return {
		group:
			'default',

		planKey:
			'mcheyne',

		value: {}
	};
}

function createValidatedCandidate():
	ValidatedPlanDefinitionCandidate {
	return {
		group:
			'default',

		planKey:
			'mcheyne',

		definition: {
			name:
				'MCheyne',

			description:
				'Read through the Bible.',

			encodedReadings: [
				'1_1'
			]
		}
	};
}

class FakeInterpreter
	implements ResourceInterpreter<
		PlanDefinitionCandidate
	> {

	readonly resourceType =
		PLAN_DEFINITION_RESOURCE_TYPE;

	resource:
		DecodedResourceContent |
		undefined;

	interpret(
		resource:
			DecodedResourceContent
	): Iterable<PlanDefinitionCandidate> {
		this.resource =
			resource;

		return [
			createCandidate()
		];
	}
}

class FakeValidator
	implements ResourceValidator<
		PlanDefinitionCandidate,
		ValidatedPlanDefinitionCandidate
	> {

	candidate:
		PlanDefinitionCandidate |
		undefined;

	validate(
		candidate:
			PlanDefinitionCandidate
	): ValidatedPlanDefinitionCandidate {
		this.candidate =
			candidate;

		return createValidatedCandidate();
	}
}

class ThrowingValidator
	implements ResourceValidator<
		PlanDefinitionCandidate,
		ValidatedPlanDefinitionCandidate
	> {

	validate():
		ValidatedPlanDefinitionCandidate {
		throw new Error(
			'validation failed'
		);
	}
}

class FakeInstaller
	implements PlanDefinitionResourceInstaller {

	installCount =
		0;

	resource:
		DecodedResourceContent |
		undefined;

	candidates:
		readonly ValidatedPlanDefinitionCandidate[] =
			[];

	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedPlanDefinitionCandidate[]
	): Promise<void> {
		this.installCount++;
		this.resource =
			resource;
		this.candidates =
			candidates;
	}
}

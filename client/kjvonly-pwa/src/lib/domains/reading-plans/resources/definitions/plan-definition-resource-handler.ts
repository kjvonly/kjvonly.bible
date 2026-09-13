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
	ResourceHandler
} from '$lib/resource/installation/resource-handler';

import type {
	PlanDefinitionCandidate
} from './plan-definition-candidate';

import type {
	ValidatedPlanDefinitionCandidate
} from './validated-plan-definition-candidate';

import {
	PLAN_DEFINITION_RESOURCE_TYPE
} from './plan-definition-interpreter';

export interface PlanDefinitionResourceInstaller {
	install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedPlanDefinitionCandidate[]
	): Promise<void>;
}

export class PlanDefinitionResourceHandler
	implements ResourceHandler {

	readonly resourceType =
		PLAN_DEFINITION_RESOURCE_TYPE;

	constructor(
		private readonly interpreter:
			ResourceInterpreter<
				PlanDefinitionCandidate
			>,

		private readonly validator:
			ResourceValidator<
				PlanDefinitionCandidate,
				ValidatedPlanDefinitionCandidate
			>,

		private readonly installer:
			PlanDefinitionResourceInstaller
	) {}

	async handle(
		resource:
			DecodedResourceContent
	): Promise<void> {
		const candidates =
			[
				...this.interpreter.interpret(
					resource
				)
			];

		const validated =
			candidates.map(
				(candidate) =>
					this.validator.validate(
						candidate
					)
			);

		await this.installer.install(
			resource,
			validated
		);
	}
}

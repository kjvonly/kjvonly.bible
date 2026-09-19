import type {
	DecodedResourceContent,
	ResourceHandler,
	ResourceInterpreter,
	ResourceValidator
} from '$lib/resource';

import type {
	PlanProgressCandidate
} from './plan-progress-candidate';

import {
	PLAN_PROGRESS_RESOURCE_TYPE
} from './plan-progress-resource';

import type {
	ValidatedPlanProgressCandidate
} from './validated-plan-progress-candidate';

export interface PlanProgressResourceInstaller {
	install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedPlanProgressCandidate[]
	): Promise<void>;
}

export class PlanProgressResourceHandler
	implements ResourceHandler {

	readonly resourceType =
		PLAN_PROGRESS_RESOURCE_TYPE;

	constructor(
		private readonly interpreter:
			ResourceInterpreter<
				PlanProgressCandidate
			>,

		private readonly validator:
			ResourceValidator<
				PlanProgressCandidate,
				ValidatedPlanProgressCandidate
			>,

		private readonly installer:
			PlanProgressResourceInstaller
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

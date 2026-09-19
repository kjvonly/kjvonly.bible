import type {
	DecodedResourceContent,
	ResourceHandler,
	ResourceInterpreter,
	ResourceValidator
} from '$lib/resource';

import type {
	PlanSubscriptionCandidate
} from './plan-subscription-candidate';

import {
	PLAN_SUBSCRIPTION_RESOURCE_TYPE
} from './plan-subscription-resource-source';

import type {
	ValidatedPlanSubscriptionCandidate
} from './validated-plan-subscription-candidate';

export interface PlanSubscriptionResourceInstaller {
	install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedPlanSubscriptionCandidate[]
	): Promise<void>;
}

export class PlanSubscriptionResourceHandler
	implements ResourceHandler {

	readonly resourceType =
		PLAN_SUBSCRIPTION_RESOURCE_TYPE;

	constructor(
		private readonly interpreter:
			ResourceInterpreter<
				PlanSubscriptionCandidate
			>,

		private readonly validator:
			ResourceValidator<
				PlanSubscriptionCandidate,
				ValidatedPlanSubscriptionCandidate
			>,

		private readonly installer:
			PlanSubscriptionResourceInstaller
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

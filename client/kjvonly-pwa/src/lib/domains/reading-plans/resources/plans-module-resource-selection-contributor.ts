import {
	Modules
} from '$lib/application';

import {
	buildRequiredResourceSelections,
	type ModuleResourceSelectionBuildContext,
	type ModuleResourceSelectionContributor,
	type ResourceSelections
} from '$lib/application';

import {
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from '$lib/domains/bible';

import {
	PLAN_DEFINITION_RESOURCE_TYPE
} from './definitions/plan-definition-interpreter';

import {
	createDefaultPlanDefinitionSelection
} from './definitions/plan-definition-default-selection';

import {
	PLAN_SUBSCRIPTION_RESOURCE_TYPE,
	createDefaultPlanSubscriptionSelection
} from './subscriptions/plan-subscription-resource-source';

const RESOURCE_TYPES = [
	BIBLE_BOOKNAMES_RESOURCE_TYPE,
	PLAN_DEFINITION_RESOURCE_TYPE,
	PLAN_SUBSCRIPTION_RESOURCE_TYPE
] as const;

export interface CurrentUserIdentityProvider {
	tryGetUserId():
		string |
		undefined;
}

export class PlansModuleResourceSelectionContributor
implements ModuleResourceSelectionContributor {
	readonly module =
		Modules.PLANS;

	constructor(
		private readonly currentUser:
			CurrentUserIdentityProvider
	) {}

	build(
		context:
			ModuleResourceSelectionBuildContext
	): ResourceSelections {
		const selections =
			buildRequiredResourceSelections(
				RESOURCE_TYPES,
				context
			);

		const needsPlanDefinitionSelection =
			selections[
				PLAN_DEFINITION_RESOURCE_TYPE
			] === undefined;

		const needsPlanSubscriptionSelection =
			selections[
				PLAN_SUBSCRIPTION_RESOURCE_TYPE
			] === undefined;

		if (
			!needsPlanDefinitionSelection &&
			!needsPlanSubscriptionSelection
		) {
			return selections;
		}

		const publisher =
			this.currentUser
				.tryGetUserId();

		if (!publisher) {
			return selections;
		}

		if (needsPlanDefinitionSelection) {
			selections[
				PLAN_DEFINITION_RESOURCE_TYPE
			] =
				createDefaultPlanDefinitionSelection(
					publisher
				);
		}

		if (needsPlanSubscriptionSelection) {
			selections[
				PLAN_SUBSCRIPTION_RESOURCE_TYPE
			] =
				createDefaultPlanSubscriptionSelection(
					publisher
				);
		}

		return selections;
	}
}

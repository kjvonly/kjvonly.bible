import {
	Modules
} from '$lib/application/models/modules.model';

import type {
	ModuleResourceSelectionBuildContext,
	ModuleResourceSelectionContributor
} from '$lib/application/resources/module-resource-selection-contributor';

import {
	buildRequiredResourceSelections
} from '$lib/application/resources/module-resource-selection-contributor';

import type {
	ResourceSelections
} from '$lib/application/resources/resource-selections';

import {
	BIBLE_BOOKNAMES_RESOURCE_TYPE
} from '$lib/domains/bible/resources/booknames/bible-booknames-interpreter';

import {
	PLAN_DEFINITION_RESOURCE_TYPE
} from './definitions/plan-definition-interpreter';

import {
	createDefaultPlanDefinitionSelection
} from './definitions/plan-definition-default-selection';

const RESOURCE_TYPES = [
	BIBLE_BOOKNAMES_RESOURCE_TYPE,
	PLAN_DEFINITION_RESOURCE_TYPE
] as const;

export interface CurrentUserPubkeyProvider {
	tryGetPubkey():
		string |
		undefined;
}

export class PlansModuleResourceSelectionContributor
implements ModuleResourceSelectionContributor {
	readonly module =
		Modules.PLANS;

	constructor(
		private readonly currentUser:
			CurrentUserPubkeyProvider
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

		if (
			selections[
				PLAN_DEFINITION_RESOURCE_TYPE
			] !== undefined
		) {
			return selections;
		}

		const publisher =
			this.currentUser
				.tryGetPubkey();

		if (!publisher) {
			return selections;
		}

		selections[
			PLAN_DEFINITION_RESOURCE_TYPE
		] =
			createDefaultPlanDefinitionSelection(
				publisher
			);

		return selections;
	}
}

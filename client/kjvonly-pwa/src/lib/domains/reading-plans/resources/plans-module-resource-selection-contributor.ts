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

const RESOURCE_TYPES = [
	BIBLE_BOOKNAMES_RESOURCE_TYPE
] as const;

export class PlansModuleResourceSelectionContributor
implements ModuleResourceSelectionContributor {
	readonly module =
		Modules.PLANS;

	build(
		context:
			ModuleResourceSelectionBuildContext
	): ResourceSelections {
		return buildRequiredResourceSelections(
			RESOURCE_TYPES,
			context
		);
	}
}

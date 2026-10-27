import type {
	Modules
} from '$lib/application/models/modules.model';

import type {
	ModuleResourceSelectionBuildContext,
	ModuleResourceSelectionContributor
} from './module-resource-selection-contributor';

import type {
	ResourceSelections
} from './resource-selections';

export class NoResourceModuleResourceSelectionContributor
implements ModuleResourceSelectionContributor {
	constructor(
		readonly module: Modules
	) {}

	build(
		_context:
			ModuleResourceSelectionBuildContext
	): ResourceSelections {
		return {};
	}
}

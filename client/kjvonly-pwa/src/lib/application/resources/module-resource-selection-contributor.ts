import type {
	Modules
} from '$lib/application/models/modules.model';

import type {
	ResourceSelections
} from './resource-selections';

export interface ModuleResourceSelectionBuildContext {
	originatingSelections:
		ResourceSelections;

	currentSelections:
		ResourceSelections;
}

export interface ModuleResourceSelectionContributor {
	readonly module: Modules;

	build(
		context:
			ModuleResourceSelectionBuildContext
	): ResourceSelections;
}

export function buildRequiredResourceSelections(
	resourceTypes: readonly string[],
	context:
		ModuleResourceSelectionBuildContext
): ResourceSelections {
	const result:
		ResourceSelections =
		{};

	for (
		const resourceType of
		resourceTypes
	) {
		const selection =
			context
				.originatingSelections[
					resourceType
				] ??
			context
				.currentSelections[
					resourceType
				];

		if (!selection) {
			continue;
		}

		result[
			resourceType
		] = {
			...selection
		};
	}

	return result;
}

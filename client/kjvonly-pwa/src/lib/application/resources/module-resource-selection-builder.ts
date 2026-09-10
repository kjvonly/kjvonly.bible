import type {
	ResourceSelections
} from './resource-selections';

import {
	getModuleResourceRequirements
} from './module-resource-requirements';

import type {
	Modules
} from '$lib/application/models/modules.model';

export interface ResourceSelectionSnapshotProvider {
	snapshot(): ResourceSelections;
}

export class ModuleResourceSelectionBuilder {
	constructor(
		private readonly selections:
			ResourceSelectionSnapshotProvider
	) {}

	independent(
		module: Modules
	): ResourceSelections {
		return this.build(
			module,
			{}
		);
	}

	related(
		module: Modules,
		originatingSelections:
			ResourceSelections
	): ResourceSelections {
		return this.build(
			module,
			originatingSelections
		);
	}

	private build(
		module: Modules,
		originatingSelections:
			ResourceSelections
	): ResourceSelections {
		const currentSelections =
			this.selections.snapshot();

		const result:
			ResourceSelections =
			{};

		for (
			const resourceType of
			getModuleResourceRequirements(
				module
			)
		) {
			const selection =
				originatingSelections[
					resourceType
				] ??
				currentSelections[
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
}

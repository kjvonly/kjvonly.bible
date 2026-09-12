import type {
	ResourceSelections
} from './resource-selections';

import type {
	Modules
} from '$lib/application/models/modules.model';

import type {
	ModuleResourceSelectionContributor
} from './module-resource-selection-contributor';

export interface ResourceSelectionSnapshotProvider {
	snapshot(): ResourceSelections;
}

export class ModuleResourceSelectionBuilder {
	private readonly contributors:
		ReadonlyMap<
			Modules,
			ModuleResourceSelectionContributor
		>;

	constructor(
		private readonly selections:
			ResourceSelectionSnapshotProvider,

		contributors:
			readonly ModuleResourceSelectionContributor[]
	) {
		this.contributors =
			new Map(
				contributors.map(
					contributor => [
						contributor.module,
						contributor
					] as const
				)
			);
	}

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
		const contributor =
			this.contributors.get(
				module
			);

		if (!contributor) {
			throw new Error(
				`No Resource selection contributor registered for module: ${module}`
			);
		}

		return contributor.build({
			originatingSelections,
			currentSelections:
				this.selections
					.snapshot()
		});
	}
}

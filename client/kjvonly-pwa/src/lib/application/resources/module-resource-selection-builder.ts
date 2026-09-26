import type {
	PublishedResourceReference
} from '$lib/resource';

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

	/**
	 * Rebuilds a Module's Resource selections after one selection changes.
	 *
	 * The supplied selections are treated as the candidate originating state.
	 * The requested selection is replaced on a copy and the normal Module
	 * contributor is then allowed to preserve, discard, replace, or default
	 * selections according to the same policy used for related interactions.
	 */
	update(
		module: Modules,
		selections: ResourceSelections,
		resourceType: string,
		value: PublishedResourceReference
	): ResourceSelections {
		return this.build(
			module,
			{
				...selections,
				[resourceType]: {
					...value
				}
			}
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

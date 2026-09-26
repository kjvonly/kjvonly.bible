import type {
	Modules
} from '../models/modules.model';

import type {
	ModuleResourceSelectionBuilder
} from '../resources/module-resource-selection-builder';

import type {
	ResourceSelections
} from '../resources/resource-selections';

import type {
	NavigationState,
	NavigationViewState
} from './navigation.service';

type ResourceSelectionBuilder =
	Pick<
		ModuleResourceSelectionBuilder,
		'independent' | 'related'
	>;

/**
 * Creates the serialized state for a new flat navigation entry.
 *
 * Resource selections are derived here rather than supplied by the caller so
 * every new entry goes through the target Module's existing selection policy.
 */
export class NavigationStateBuilder {
	constructor(
		private readonly resourceSelections:
			ResourceSelectionBuilder
	) {}

	create<
		TView extends string | number
	>(
		module: Modules,
		view: TView,
		viewState: NavigationViewState,
		originatingState?: NavigationState
	): NavigationState<TView> {
		const {
			resourceSelections: _resourceSelections,
			...viewStateWithoutResourceSelections
		} = viewState;

		const originatingSelections =
			originatingState?.state
				.resourceSelections;

		const selections =
			originatingSelections === undefined
				? this.resourceSelections
					.independent(module)
				: this.resourceSelections
					.related(
						module,
						copyResourceSelections(
							originatingSelections
						)
					);

		const state:
			NavigationViewState = {
				...viewStateWithoutResourceSelections
			};

		if (
			Object.keys(
				selections
			).length > 0
		) {
			state.resourceSelections =
				copyResourceSelections(
					selections
				);
		}

		return {
			module,
			view,
			state
		};
	}
}

function copyResourceSelections(
	selections: ResourceSelections
): ResourceSelections {
	const copy:
		ResourceSelections = {};

	for (
		const [
			resourceType,
			reference
		] of Object.entries(
			selections
		)
	) {
		copy[resourceType] = {
			...reference
		};
	}

	return copy;
}

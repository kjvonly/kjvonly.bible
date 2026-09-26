import type {
	PublishedResourceReference
} from '$lib/resource';

import {
	Modules
} from '$lib/application/models/modules.model';

import type {
	NavigationState
} from '$lib/application/services/navigation.service';

import {
	parseResourceSelections,
	requireResourceSelection,
	type ResourceSelections
} from '$lib/application/resources/resource-selections';

interface ModuleResourceSelectionsBuilder {
	independent(
		module: Modules
	): ResourceSelections;

	related(
		module: Modules,
		originatingSelections:
			ResourceSelections
	): ResourceSelections;
}

export interface ModuleResourceSelectionResolver {
	find(
		navigationState: NavigationState,
		resourceType: string
	):
		PublishedResourceReference |
		undefined;

	require(
		navigationState: NavigationState,
		resourceType: string
	): PublishedResourceReference;
}

class DefaultModuleResourceSelectionResolver
	implements ModuleResourceSelectionResolver {

	constructor(
		private readonly selections:
			ModuleResourceSelectionsBuilder
	) {}

	/**
	 * Resolves an optional Resource selection from the state owned by one
	 * navigation interaction.
	 *
	 * Navigation view state may omit Resource selections entirely. In that case
	 * the existing module contributor supplies the same defaults used when
	 * creating an independent Module interaction. The consuming Module does not
	 * need a separate fallback.
	 */
	find(
		navigationState: NavigationState,
		resourceType: string
	):
		PublishedResourceReference |
		undefined {
		return this.resolveSelections(
			navigationState
		)[resourceType];
	}

	/**
	 * Resolves a required Resource selection from one NavigationState.
	 * Missing/partial navigation selections are completed through the target
	 * Module's existing Resource selection contributor before the requirement
	 * is evaluated.
	 */
	require(
		navigationState: NavigationState,
		resourceType: string
	): PublishedResourceReference {
		return requireResourceSelection(
			this.resolveSelections(
				navigationState
			),
			resourceType
		);
	}

	private resolveSelections(
		navigationState: NavigationState
	): ResourceSelections {
		const module =
			navigationState.module;

		if (
			typeof module !== 'number' ||
			Modules[module] === undefined
		) {
			throw new Error(
				'Invalid navigation module'
			);
		}

		const originatingSelections =
			navigationState.state.resourceSelections === undefined
				? undefined
				: parseResourceSelections(
					navigationState.state.resourceSelections
				);

		const resolved =
			originatingSelections === undefined
				? this.selections.independent(
					module
				)
				: this.selections.related(
					module,
					originatingSelections
				);

		navigationState.state.resourceSelections =
			resolved;

		return resolved;
	}
}

export function createModuleResourceSelectionResolver(
	selections:
		ModuleResourceSelectionsBuilder
): ModuleResourceSelectionResolver {
	return new DefaultModuleResourceSelectionResolver(
		selections
	);
}

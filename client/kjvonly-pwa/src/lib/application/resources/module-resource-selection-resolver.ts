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

interface WorkspacePaneLookup {
	findPane(
		paneID: string
	): {
		buffer?: {
			resourceSelections?:
				Record<string, PublishedResourceReference>;
		};
	} | undefined;
}

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
		paneID: string,
		resourceType: string
	):
		PublishedResourceReference |
		undefined;

	require(
		paneID: string,
		resourceType: string
	): PublishedResourceReference;

	findWithNavigationState(
		navigationState: NavigationState,
		resourceType: string
	):
		PublishedResourceReference |
		undefined;

	requireWithNavigationState(
		navigationState: NavigationState,
		resourceType: string
	): PublishedResourceReference;
}

class DefaultModuleResourceSelectionResolver
	implements ModuleResourceSelectionResolver {

	constructor(
		private readonly panes:
			WorkspacePaneLookup,

		private readonly selections:
			ModuleResourceSelectionsBuilder
	) {}

	find(
		paneID: string,
		resourceType: string
	):
		PublishedResourceReference |
		undefined {
		const pane =
			this.panes.findPane(
				paneID
			);

		if (!pane) {
			throw new Error(
				`Module Pane not found: ${paneID}`
			);
		}

		if (!pane.buffer) {
			throw new Error(
				`Module Buffer not found for Pane: ${paneID}`
			);
		}

		return pane.buffer
			.resourceSelections?.[
				resourceType
			];
	}

	require(
		paneID: string,
		resourceType: string
	): PublishedResourceReference {
		const pane =
			this.panes.findPane(
				paneID
			);

		if (!pane) {
			throw new Error(
				`Module Pane not found: ${paneID}`
			);
		}

		if (!pane.buffer) {
			throw new Error(
				`Module Buffer not found for Pane: ${paneID}`
			);
		}

		return requireResourceSelection(
			pane.buffer.resourceSelections,
			resourceType
		);
	}

	/**
	 * Resolves an optional Resource selection from the state owned by one
	 * navigation interaction.
	 *
	 * Navigation view state may omit Resource selections entirely. In that case
	 * the existing module contributor supplies the same defaults used when
	 * creating an independent Module interaction. The consuming Module does not
	 * need a separate fallback.
	 */
	findWithNavigationState(
		navigationState: NavigationState,
		resourceType: string
	):
		PublishedResourceReference |
		undefined {
		return this.resolveNavigationSelections(
			navigationState
		)[resourceType];
	}

	/**
	 * Resolves a required Resource selection from one navigation interaction.
	 * Missing/partial navigation selections are completed through the target
	 * Module's existing Resource selection contributor before the requirement
	 * is evaluated.
	 */
	requireWithNavigationState(
		navigationState: NavigationState,
		resourceType: string
	): PublishedResourceReference {
		return requireResourceSelection(
			this.resolveNavigationSelections(
				navigationState
			),
			resourceType
		);
	}

	private resolveNavigationSelections(
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
	panes:
		WorkspacePaneLookup,

	selections:
		ModuleResourceSelectionsBuilder
): ModuleResourceSelectionResolver {
	return new DefaultModuleResourceSelectionResolver(
		panes,
		selections
	);
}

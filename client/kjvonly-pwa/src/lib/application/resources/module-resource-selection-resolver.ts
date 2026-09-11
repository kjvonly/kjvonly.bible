import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	Pane
} from '$lib/application/runtime/pane/models/pane.model';

import {
	requireResourceSelection
} from '$lib/application/resources/resource-selections';

interface WorkspacePaneLookup {
	readonly rootPane:
		Pane;

	findNode(
		pane: Pane,
		paneID: string
	): Pane | undefined;
}

export interface ModuleResourceSelectionResolver {
	require(
		paneID: string,
		resourceType: string
	): PublishedResourceReference;
}

class DefaultModuleResourceSelectionResolver
	implements ModuleResourceSelectionResolver {

	constructor(
		private readonly panes:
			WorkspacePaneLookup
	) {}

	require(
		paneID: string,
		resourceType: string
	): PublishedResourceReference {
		const pane =
			this.panes.findNode(
				this.panes.rootPane,
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
}

export function createModuleResourceSelectionResolver(
	panes:
		WorkspacePaneLookup
): ModuleResourceSelectionResolver {
	return new DefaultModuleResourceSelectionResolver(
		panes
	);
}

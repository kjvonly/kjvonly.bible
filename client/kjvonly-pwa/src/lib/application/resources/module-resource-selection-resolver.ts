import type {
	PublishedResourceReference
} from '$lib/resource';

import {
	requireResourceSelection
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
}

class DefaultModuleResourceSelectionResolver
	implements ModuleResourceSelectionResolver {

	constructor(
		private readonly panes:
			WorkspacePaneLookup
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
}

export function createModuleResourceSelectionResolver(
	panes:
		WorkspacePaneLookup
): ModuleResourceSelectionResolver {
	return new DefaultModuleResourceSelectionResolver(
		panes
	);
}

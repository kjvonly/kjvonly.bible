import type {
	NavigationState
} from '../../services/navigation.service';

import type {
	PaneState
} from './models/pane-state.model';

import type {
	WorkspaceSplitResult
} from '../workspace/workspace-runtime';

import type {
	PaneSplit
} from './models/pane-split';

interface PaneNavigationWorkspace {
	splitPaneWithState(
		paneID: string,
		split: PaneSplit,
		state: PaneState
	): WorkspaceSplitResult | undefined;
}

/**
 * Bridges semantic Pane navigation splits to Workspace Pane-tree mutation.
 *
 * Navigation callers provide the complete initial stack for the new Pane. This
 * adapter prepares the persisted state owned directly by the new Pane.
 */
export class PaneNavigationSplitter {
	constructor(
		private readonly workspace:
			PaneNavigationWorkspace
	) {}

	split(
		paneID: string,
		split: PaneSplit,
		navigationStates:
			readonly NavigationState[]
	): WorkspaceSplitResult | undefined {
		const state: PaneState = {
			navigation: [
				...navigationStates
			]
		};

		return this.workspace
			.splitPaneWithState(
				paneID,
				split,
				state
			);
	}
}

import type { PaneState } from '$lib/application/runtime/pane/models/pane-state.model';
import type { PaneSplit } from '$lib/application/runtime/pane/models/pane-split';
import type { Pane } from '$lib/application/runtime/pane/models/pane.model';

import {
	deriveWorkspaceLayout,
	type WorkspaceLayout,
	type WorkspacePaneDimensionsByID
} from './workspace-layout';

import {
	deletePane as deletePaneFromTree,
	findPane,
	splitPane as splitPaneInTree,
	type DeletePaneResult
} from './workspace-pane-tree';

interface WorkspacePaneState {
	readonly rootPane: Pane;
	paneDimensionsByID: WorkspacePaneDimensionsByID;

	restore(): boolean;
	save(): void;
	subscribeToPaneDimensions(
		paneID: string,
		subscriber: (
			paneDimensionsByID: WorkspacePaneDimensionsByID
		) => void
	): void;
	unsubscribeFromPaneDimensions(paneID: string): void;
	publishPaneDimensions(
		paneDimensionsByID: WorkspacePaneDimensionsByID
	): void;
}

export interface WorkspaceSplitResult {
	newPaneID: string;
}

export enum WorkspaceChangeType {
	PANE_SPLIT = 'pane-split',
	PANE_DELETED = 'pane-deleted'
}

export type WorkspaceChange =
	| {
		type: WorkspaceChangeType.PANE_SPLIT;
		newPaneID: string;
	}
	| {
		type: WorkspaceChangeType.PANE_DELETED;
		deletedPaneID: string;
	};

type WorkspaceChangeSubscriber = (
	change: WorkspaceChange
) => void;

export class WorkspaceRuntime {
	private readonly allocatedPaneIDs =
		new Set<string>();

	private readonly subscribers =
		new Set<WorkspaceChangeSubscriber>();

	constructor(
		private readonly panes:
			WorkspacePaneState
	) {}

	initialize(): boolean {
		const restored =
			this.panes.restore();

		if (restored) {
			return true;
		}

		this.panes.rootPane.state =
			{};

		return false;
	}

	subscribe(
		subscriber: WorkspaceChangeSubscriber
	): () => void {
		this.subscribers.add(
			subscriber
		);

		return () => {
			this.subscribers.delete(
				subscriber
			);
		};
	}

	findPane(
		paneID: string
	): Pane | undefined {
		return findPane(
			this.panes.rootPane,
			paneID
		);
	}

	deriveLayout(): WorkspaceLayout {
		return deriveWorkspaceLayout(
			this.panes.rootPane
		);
	}

	getPaneDimensions(): WorkspacePaneDimensionsByID {
		return this.panes
			.paneDimensionsByID;
	}

	publishPaneDimensions(
		paneDimensionsByID: WorkspacePaneDimensionsByID
	): void {
		this.panes.paneDimensionsByID =
			paneDimensionsByID;

		this.panes.publishPaneDimensions(
			paneDimensionsByID
		);
	}

	subscribeToPaneDimensions(
		paneID: string,
		subscriber: (
			paneDimensionsByID: WorkspacePaneDimensionsByID
		) => void
	): () => void {
		this.panes.subscribeToPaneDimensions(
			paneID,
			subscriber
		);

		return () => {
			this.panes.unsubscribeFromPaneDimensions(
				paneID
			);
		};
	}

	persistWorkspace(): void {
		this.panes.save();
	}

	/**
	 * Splits a Pane using already-prepared persisted Pane state.
	 *
	 * WorkspaceRuntime owns Pane-tree mutation, ID allocation, persistence, and
	 * change publication. The caller owns the semantic contents of the state.
	 */
	splitPaneWithState(
		paneID: string,
		split: PaneSplit,
		state: PaneState
	): WorkspaceSplitResult | undefined {
		const pane =
			this.findPane(
				paneID
			);

		if (!pane?.state) {
			return undefined;
		}

		this.trackCurrentPaneIDs();

		const newPaneID =
			this.allocatePaneID();

		if (
			!splitPaneInTree({
				rootPane:
					this.panes.rootPane,
				paneID,
				newPaneID,
				split,
				state
			})
		) {
			return undefined;
		}

		this.panes.save();

		this.publish({
			type:
				WorkspaceChangeType.PANE_SPLIT,
			newPaneID
		});

		return {
			newPaneID
		};
	}

	deletePane(
		paneID: string
	): DeletePaneResult | undefined {
		this.trackCurrentPaneIDs();

		const result =
			deletePaneFromTree(
				this.panes.rootPane,
				paneID
			);

		if (!result) {
			return undefined;
		}

		this.panes.unsubscribeFromPaneDimensions(
			result.deletedPaneID
		);
		this.panes.save();

		this.publish({
			type:
				WorkspaceChangeType.PANE_DELETED,
			deletedPaneID:
				result.deletedPaneID
		});

		return result;
	}

	private publish(
		change: WorkspaceChange
	): void {
		for (
			const subscriber
			of this.subscribers
		) {
			subscriber(
				change
			);
		}
	}

	private trackCurrentPaneIDs(): void {
		collectPaneIDs(
			this.panes.rootPane,
			this.allocatedPaneIDs
		);
	}

	private allocatePaneID(): string {
		const lastPaneID =
			findLastPaneID(
				this.allocatedPaneIDs
			);

		const nextPaneID =
			lastPaneID === undefined
				? 'a'
				: incrementPaneID(
					lastPaneID
				);

		this.allocatedPaneIDs.add(
			nextPaneID
		);

		return nextPaneID;
	}
}

function collectPaneIDs(
	pane: Pane,
	paneIDs: Set<string>
): void {
	if (pane.id) {
		paneIDs.add(
			pane.id
		);
	}

	if (pane.left) {
		collectPaneIDs(
			pane.left,
			paneIDs
		);
	}

	if (pane.right) {
		collectPaneIDs(
			pane.right,
			paneIDs
		);
	}
}

function findLastPaneID(
	paneIDs: ReadonlySet<string>
): string | undefined {
	let lastPaneID:
		string | undefined;

	for (const paneID of paneIDs) {
		if (
			lastPaneID === undefined ||
			comparePaneIDs(
				paneID,
				lastPaneID
			) > 0
		) {
			lastPaneID =
				paneID;
		}
	}

	return lastPaneID;
}

function comparePaneIDs(
	left: string,
	right: string
): number {
	if (
		left.length !==
		right.length
	) {
		return (
			left.length -
			right.length
		);
	}

	return left.localeCompare(
		right
	);
}

function incrementPaneID(
	paneID: string
): string {
	const characters =
		paneID.split('');

	for (
		let index =
			characters.length - 1;
		index >= 0;
		index--
	) {
		if (
			characters[index] !==
			'z'
		) {
			characters[index] =
				String.fromCharCode(
					characters[index]
						.charCodeAt(0) + 1
				);

			return characters.join('');
		}

		characters[index] = 'a';
	}

	return (
		'a' +
		characters.join('')
	);
}

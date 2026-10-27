import type { PaneState } from '$lib/application/runtime/pane/models/pane-state.model';
import type { Pane } from '$lib/application/runtime/pane/models/pane.model';
import type { PaneSplit } from '$lib/application/runtime/pane/models/pane-split';

export interface SplitPaneInput {
	rootPane: Pane;
	paneID: string;
	newPaneID: string;
	split: PaneSplit;
	state: PaneState;
}

export interface DeletePaneResult {
	deletedPaneID: string;
}

export function findPane(
	pane: Pane,
	paneID: string
): Pane | undefined {
	if (pane.id === paneID) {
		return pane;
	}

	if (pane.left) {
		const found = findPane(
			pane.left,
			paneID
		);

		if (found) {
			return found;
		}
	}

	if (pane.right) {
		return findPane(
			pane.right,
			paneID
		);
	}

	return undefined;
}

export function splitPane({
	rootPane,
	paneID,
	newPaneID,
	split,
	state
}: SplitPaneInput): boolean {
	const pane = findPane(
		rootPane,
		paneID
	);

	if (!pane) {
		return false;
	}

	pane.split = split;
	pane.left = {
		id:
			pane.id,
		state:
			pane.state
	};
	pane.right = {
		id:
			newPaneID,
		state
	};
	pane.id = undefined;
	pane.state = undefined;

	return true;
}

export function deletePane(
	rootPane: Pane,
	paneID: string
): DeletePaneResult | undefined {
	if (
		rootPane.left === undefined &&
		rootPane.right === undefined
	) {
		return undefined;
	}

	return deleteFromBranch(
		rootPane,
		paneID
	);
}

function deleteFromBranch(
	pane: Pane,
	paneID: string
): DeletePaneResult | undefined {
	if (
		pane.left &&
		pane.left.id === paneID
	) {
		const deletedPaneID =
			pane.left.id;

		collapseInto(
			pane,
			pane.right
		);

		return {
			deletedPaneID
		};
	}

	if (pane.left?.split) {
		const result =
			deleteFromBranch(
				pane.left,
				paneID
			);

		if (result) {
			return result;
		}
	}

	if (
		pane.right &&
		pane.right.id === paneID
	) {
		const deletedPaneID =
			pane.right.id;

		collapseInto(
			pane,
			pane.left
		);

		return {
			deletedPaneID
		};
	}

	if (pane.right?.split) {
		return deleteFromBranch(
			pane.right,
			paneID
		);
	}

	return undefined;
}

function collapseInto(
	target: Pane,
	sibling: Pane
): void {
	if (sibling.split) {
		target.id =
			undefined;
		target.state =
			undefined;
		target.split =
			sibling.split;
		target.left =
			sibling.left;
		target.right =
			sibling.right;
		return;
	}

	target.id =
		sibling.id;
	target.state =
		sibling.state;
	target.split =
		undefined;
	target.left =
		undefined;
	target.right =
		undefined;
}

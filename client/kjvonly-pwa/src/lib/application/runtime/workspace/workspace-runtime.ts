import { Modules } from '$lib/application/models/modules.model';
import type { Buffer } from '$lib/application/runtime/buffer/models/buffer.model';
import type { BufferBag } from '$lib/application/runtime/buffer/models/buffer-bag.model';
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

interface WorkspaceBufferFactory {
	independent(
		module: Modules,
		bag?: BufferBag
	): Buffer;

	related(
		module: Modules,
		originatingBuffer: Buffer,
		bag?: BufferBag
	): Buffer;

	reconcileRestored(
		buffer: Buffer
	): void;
}

export interface WorkspaceSplitResult {
	newPaneID: string;
}

export enum WorkspaceChangeType {
	PANE_SPLIT = 'pane-split',
	PANE_DELETED = 'pane-deleted',
	PANE_BUFFER_REPLACED = 'pane-buffer-replaced'
}

export type WorkspaceChange =
	| {
		type: WorkspaceChangeType.PANE_SPLIT;
		newPaneID: string;
	}
	| {
		type: WorkspaceChangeType.PANE_DELETED;
		deletedPaneID: string;
	}
	| {
		type: WorkspaceChangeType.PANE_BUFFER_REPLACED;
		paneID: string;
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
			WorkspacePaneState,
		private readonly buffers:
			WorkspaceBufferFactory
	) {}

	initialize(
		defaultModule: Modules
	): boolean {
		const restored =
			this.panes.restore();

		if (restored) {
			this.reconcileRestoredBuffers(
				this.panes.rootPane
			);

			return true;
		}

		this.panes.rootPane.buffer =
			this.buffers.independent(
				defaultModule
			);

		return false;
	}

	private reconcileRestoredBuffers(
		pane: Pane
	): void {
		if (pane.buffer) {
			this.buffers
				.reconcileRestored(
					pane.buffer
				);
		}

		if (pane.left) {
			this.reconcileRestoredBuffers(
				pane.left
			);
		}

		if (pane.right) {
			this.reconcileRestoredBuffers(
				pane.right
			);
		}
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

	replaceBuffer(
		paneID: string,
		module: Modules,
		bag?: BufferBag
	): boolean {
		const pane =
			this.findPane(
				paneID
			);

		if (!pane) {
			return false;
		}

		const currentBuffer =
			pane.buffer;

		const navigationContext =
			bag === undefined
				? currentBuffer?.bag ?? {}
				: bag;

		pane.buffer =
			currentBuffer
				? this.buffers.related(
					module,
					currentBuffer,
					navigationContext
				)
				: this.buffers.independent(
					module,
					navigationContext
				);

		pane.toggle =
			!pane.toggle;

		this.panes.save();

		this.publish({
			type:
				WorkspaceChangeType.PANE_BUFFER_REPLACED,
			paneID
		});

		return true;
	}

	splitPane(
		paneID: string,
		split: PaneSplit,
		module: Modules,
		bag: BufferBag
	): WorkspaceSplitResult | undefined {
		this.trackCurrentPaneIDs();

		const pane =
			this.findPane(
				paneID
			);

		if (!pane?.buffer) {
			return undefined;
		}

		const newPaneID =
			this.allocatePaneID();

		const buffer =
			this.buffers.related(
				module,
				pane.buffer,
				bag
			);

		if (
			!splitPaneInTree({
				rootPane:
					this.panes.rootPane,
				paneID,
				newPaneID,
				split,
				buffer
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

	closePane(
		paneID: string
	): boolean {
		const pane =
			this.findPane(
				paneID
			);

		if (!pane) {
			return false;
		}

		if (
			pane.buffer?.componentName !==
			Modules.MODULES
		) {
			return this.replaceBuffer(
				paneID,
				Modules.MODULES,
				{}
			);
		}

		if (
			pane ===
			this.panes.rootPane &&
			pane.left === undefined &&
			pane.right === undefined
		) {
			return true;
		}

		return (
			this.deletePane(
				paneID
			) !== undefined
		);
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

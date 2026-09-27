import { describe, expect, it, vi } from 'vitest';

import type { PaneState } from '$lib/application/runtime/pane/models/pane-state.model';
import { PaneSplit } from '$lib/application/runtime/pane/models/pane-split';
import type { Pane } from '$lib/application/runtime/pane/models/pane.model';

import { WorkspaceChangeType, WorkspaceRuntime } from './workspace-runtime';

describe('WorkspaceRuntime', () => {
	it('restores the persisted Workspace during initialization', () => {
		const panes = paneState(leaf('a'), true);
		const runtime = new WorkspaceRuntime(panes);

		expect(runtime.initialize()).toBe(true);
		expect(panes.restore).toHaveBeenCalledOnce();
	});

	it('creates default Pane state when no Workspace is persisted', () => {
		const panes = paneState(emptyLeaf('a'), false);
		const runtime = new WorkspaceRuntime(panes);

		expect(runtime.initialize()).toBe(false);
		expect(panes.rootPane.state).toEqual({});
		expect(panes.save).not.toHaveBeenCalled();
	});

	it('derives layout from the current Pane tree', () => {
		const runtime = new WorkspaceRuntime(
			paneState(branch(PaneSplit.VERTICAL, leaf('a'), leaf('b')))
		);

		expect(runtime.deriveLayout().paneDimensionsByID).toEqual({
			a: { height: 1, width: 0.5 },
			b: { height: 1, width: 0.5 }
		});
	});

	it('publishes and exposes current Pane dimensions', () => {
		const panes = paneState(leaf('a'));
		const runtime = new WorkspaceRuntime(panes);
		const dimensions = {
			a: { height: 1, width: 1 }
		};

		runtime.publishPaneDimensions(dimensions);

		expect(runtime.getPaneDimensions()).toBe(dimensions);
		expect(panes.publishPaneDimensions).toHaveBeenCalledWith(dimensions);
	});

	it('subscribes to Pane dimensions and returns cleanup', () => {
		const panes = paneState(leaf('a'));
		const runtime = new WorkspaceRuntime(panes);
		const subscriber = vi.fn();

		const unsubscribe = runtime.subscribeToPaneDimensions('a', subscriber);

		expect(panes.subscribeToPaneDimensions).toHaveBeenCalledWith(
			'a',
			subscriber
		);

		unsubscribe();

		expect(panes.unsubscribeFromPaneDimensions).toHaveBeenCalledWith('a');
	});

	it('persists the current Workspace on request', () => {
		const panes = paneState(leaf('a'));
		const runtime = new WorkspaceRuntime(panes);

		runtime.persistWorkspace();

		expect(panes.save).toHaveBeenCalledOnce();
	});

	it('splits a Pane with already-prepared state without rebuilding it', () => {
		const originalState = state('original');
		const navigationState = state('navigation');
		const panes = paneState(leaf('a', originalState));
		const runtime = new WorkspaceRuntime(panes);
		const onChange = vi.fn();

		runtime.subscribe(onChange);

		expect(
			runtime.splitPaneWithState(
				'a',
				PaneSplit.VERTICAL,
				navigationState
			)
		).toEqual({ newPaneID: 'b' });

		expect(panes.rootPane.left?.id).toBe('a');
		expect(panes.rootPane.left?.state).toBe(originalState);
		expect(panes.rootPane.right?.id).toBe('b');
		expect(panes.rootPane.right?.state).toBe(navigationState);
		expect(panes.rootPane.state).toBeUndefined();
		expect(panes.save).toHaveBeenCalledOnce();
		expect(onChange).toHaveBeenCalledWith({
			type: WorkspaceChangeType.PANE_SPLIT,
			newPaneID: 'b'
		});
	});

	it('does not reuse a Pane id deleted during the current runtime', () => {
		const panes = paneState(branch(PaneSplit.VERTICAL, leaf('a'), leaf('b')));
		const runtime = new WorkspaceRuntime(panes);

		expect(
			runtime.splitPaneWithState(
				'b',
				PaneSplit.HORIZONTAL,
				{}
			)
		).toEqual({ newPaneID: 'c' });

		expect(runtime.deletePane('c')).toEqual({ deletedPaneID: 'c' });

		expect(
			runtime.splitPaneWithState(
				'a',
				PaneSplit.VERTICAL,
				{}
			)
		).toEqual({ newPaneID: 'd' });
	});

	it('allocates correctly across the z to aa boundary', () => {
		const panes = paneState(branch(PaneSplit.VERTICAL, leaf('a'), leaf('z')));
		const runtime = new WorkspaceRuntime(panes);

		expect(
			runtime.splitPaneWithState(
				'a',
				PaneSplit.VERTICAL,
				{}
			)
		).toEqual({ newPaneID: 'aa' });
	});

	it('deletes a Pane, unsubscribes it, and persists the Workspace', () => {
		const panes = paneState(branch(PaneSplit.VERTICAL, leaf('a'), leaf('b')));
		const runtime = new WorkspaceRuntime(panes);
		const onChange = vi.fn();

		runtime.subscribe(onChange);

		expect(runtime.deletePane('b')).toEqual({ deletedPaneID: 'b' });

		expect(panes.unsubscribeFromPaneDimensions).toHaveBeenCalledWith('b');
		expect(panes.save).toHaveBeenCalledOnce();
		expect(onChange).toHaveBeenCalledWith({
			type: WorkspaceChangeType.PANE_DELETED,
			deletedPaneID: 'b'
		});
		expect(panes.rootPane.id).toBe('a');
	});

	it('stops publishing changes after a Workspace subscriber unsubscribes', () => {
		const panes = paneState(branch(PaneSplit.VERTICAL, leaf('a'), leaf('b')));
		const runtime = new WorkspaceRuntime(panes);
		const onChange = vi.fn();
		const unsubscribe = runtime.subscribe(onChange);

		unsubscribe();
		runtime.deletePane('b');

		expect(onChange).not.toHaveBeenCalled();
	});

	it('does not persist when the target Pane does not exist', () => {
		const panes = paneState(leaf('a'));
		const runtime = new WorkspaceRuntime(panes);

		expect(runtime.deletePane('missing')).toBeUndefined();
		expect(panes.save).not.toHaveBeenCalled();
		expect(panes.unsubscribeFromPaneDimensions).not.toHaveBeenCalled();
	});
});

function paneState(rootPane: Pane, restored = false) {
	return {
		rootPane,
		paneDimensionsByID: {},
		restore: vi.fn(() => restored),
		save: vi.fn(),
		subscribeToPaneDimensions: vi.fn(),
		unsubscribeFromPaneDimensions: vi.fn(),
		publishPaneDimensions: vi.fn()
	};
}

function leaf(
	id: string,
	stateValue: PaneState | undefined = {}
): Pane {
	return {
		id,
		split: undefined,
		left: undefined,
		right: undefined,
		state: stateValue
	};
}

function emptyLeaf(id: string): Pane {
	return leaf(id, undefined);
}

function branch(split: PaneSplit, left: Pane, right: Pane): Pane {
	return {
		id: undefined,
		split,
		left,
		right,
		state: undefined
	};
}

function state(label: string): PaneState {
	return { label };
}

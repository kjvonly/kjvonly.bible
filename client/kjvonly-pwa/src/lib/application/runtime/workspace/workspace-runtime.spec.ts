import { describe, expect, it, vi } from 'vitest';

import { Modules } from '$lib/application/models/modules.model';

import { Buffer } from '$lib/application/runtime/buffer/models/buffer.model';

import { PaneSplit } from '$lib/application/runtime/pane/models/pane-split';

import type { Pane } from '$lib/application/runtime/pane/models/pane.model';

import { WorkspaceChangeType, WorkspaceRuntime } from './workspace-runtime';

describe('WorkspaceRuntime', () => {
	it('restores the persisted Workspace during initialization', () => {
		const panes = paneState(leaf('a'), true);
		const buffers = {
			independent: vi.fn(),
			related: vi.fn(),
			reconcileRestored: vi.fn()
		};
		const runtime = new WorkspaceRuntime(panes, buffers);

		expect(runtime.initialize(Modules.BIBLE)).toBe(true);
		expect(panes.restore).toHaveBeenCalledOnce();
		expect(buffers.independent).not.toHaveBeenCalled();

		expect(buffers.reconcileRestored).toHaveBeenCalledWith(
			panes.rootPane.buffer
		);
	});

	it('creates the default Buffer when no Workspace is persisted', () => {
		const panes = paneState(emptyLeaf('a'), false);
		const defaultBuffer = buffer(Modules.BIBLE);
		const independent = vi.fn(() => defaultBuffer);
		const runtime = new WorkspaceRuntime(panes, {
			independent,
			related: vi.fn(),
			reconcileRestored: vi.fn()
		});

		expect(runtime.initialize(Modules.BIBLE)).toBe(false);
		expect(independent).toHaveBeenCalledWith(Modules.BIBLE);
		expect(panes.rootPane.buffer).toBe(defaultBuffer);
		expect(panes.save).not.toHaveBeenCalled();
	});

	it('derives layout from the current Pane tree', () => {
		const runtime = new WorkspaceRuntime(
			paneState(branch(PaneSplit.VERTICAL, leaf('a'), leaf('b'))),
			factory()
		);

		expect(runtime.deriveLayout().paneDimensionsByID).toEqual({
			a: {
				height: 1,
				width: 0.5
			},
			b: {
				height: 1,
				width: 0.5
			}
		});
	});

	it('publishes and exposes current Pane dimensions', () => {
		const panes = paneState(leaf('a'));
		const runtime = new WorkspaceRuntime(panes, factory());
		const dimensions = {
			a: {
				height: 1,
				width: 1
			}
		};

		runtime.publishPaneDimensions(dimensions);

		expect(runtime.getPaneDimensions()).toBe(dimensions);
		expect(panes.publishPaneDimensions).toHaveBeenCalledWith(dimensions);
	});

	it('subscribes to Pane dimensions and returns cleanup', () => {
		const panes = paneState(leaf('a'));
		const runtime = new WorkspaceRuntime(panes, factory());
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
		const runtime = new WorkspaceRuntime(panes, {
			independent: vi.fn(),
			related: vi.fn(),
			reconcileRestored: vi.fn()
		});

		runtime.persistWorkspace();

		expect(panes.save).toHaveBeenCalledOnce();
	});

	it('splits a Pane with a related Buffer and persists the Workspace', () => {
		const originalBuffer = buffer(Modules.BIBLE);
		const relatedBuffer = buffer(Modules.SEARCH);
		const panes = paneState(leaf('a', originalBuffer, false));
		const related = vi.fn(() => relatedBuffer);
		const runtime = new WorkspaceRuntime(panes, {
			independent: vi.fn(),
			related,
			reconcileRestored: vi.fn()
		});
		const onChange = vi.fn();

		runtime.subscribe(onChange);

		expect(
			runtime.splitPane('a', PaneSplit.VERTICAL, Modules.SEARCH, {
				query: 'faith'
			})
		).toEqual({
			newPaneID: 'b'
		});

		expect(related).toHaveBeenCalledWith(Modules.SEARCH, originalBuffer, {
			query: 'faith'
		});
		expect(panes.rootPane.left?.id).toBe('a');
		expect(panes.rootPane.left?.toggle).toBe(false);
		expect(panes.rootPane.right?.id).toBe('b');
		expect(panes.rootPane.right?.buffer).toBe(relatedBuffer);
		expect(panes.save).toHaveBeenCalledOnce();
		expect(onChange).toHaveBeenCalledWith({
			type: WorkspaceChangeType.PANE_SPLIT,
			newPaneID: 'b'
		});
	});

	it('replaces a Pane Buffer with a related Buffer and preserves navigation context by default', () => {
		const originalBuffer = buffer(Modules.BIBLE);
		originalBuffer.bag = {
			bibleLocationRef: '1_1'
		};
		const replacement = buffer(Modules.SEARCH);
		const panes = paneState(leaf('a', originalBuffer, false));
		const related = vi.fn(() => replacement);
		const runtime = new WorkspaceRuntime(panes, {
			independent: vi.fn(),
			related,
			reconcileRestored: vi.fn()
		});
		const onChange = vi.fn();

		runtime.subscribe(onChange);

		expect(runtime.replaceBuffer('a', Modules.SEARCH)).toBe(true);

		expect(related).toHaveBeenCalledWith(
			Modules.SEARCH,
			originalBuffer,
			originalBuffer.bag
		);
		expect(panes.rootPane.buffer).toBe(replacement);
		expect(panes.rootPane.toggle).toBe(true);
		expect(panes.save).toHaveBeenCalledOnce();
		expect(onChange).toHaveBeenCalledWith({
			type: WorkspaceChangeType.PANE_BUFFER_REPLACED,
			paneID: 'a'
		});
	});

	it('creates an independent Buffer when replacing an empty Pane', () => {
		const replacement = buffer(Modules.BIBLE);
		const panes = paneState(emptyLeaf('a'));
		const independent = vi.fn(() => replacement);
		const runtime = new WorkspaceRuntime(panes, {
			independent,
			related: vi.fn(),
			reconcileRestored: vi.fn()
		});

		expect(
			runtime.replaceBuffer('a', Modules.BIBLE, {
				bibleLocationRef: '1_1'
			})
		).toBe(true);
		expect(independent).toHaveBeenCalledWith(Modules.BIBLE, {
			bibleLocationRef: '1_1'
		});
	});

	it('does not reuse a Pane id deleted during the current runtime', () => {
		const panes = paneState(branch(PaneSplit.VERTICAL, leaf('a'), leaf('b')));
		const runtime = new WorkspaceRuntime(panes, factory());

		expect(
			runtime.splitPane('b', PaneSplit.HORIZONTAL, Modules.BIBLE, {})
		).toEqual({
			newPaneID: 'c'
		});

		expect(runtime.deletePane('c')).toEqual({
			deletedPaneID: 'c'
		});

		expect(
			runtime.splitPane('a', PaneSplit.VERTICAL, Modules.BIBLE, {})
		).toEqual({
			newPaneID: 'd'
		});
	});

	it('allocates correctly across the z to aa boundary', () => {
		const panes = paneState(branch(PaneSplit.VERTICAL, leaf('a'), leaf('z')));
		const runtime = new WorkspaceRuntime(panes, factory());

		expect(
			runtime.splitPane('a', PaneSplit.VERTICAL, Modules.BIBLE, {})
		).toEqual({
			newPaneID: 'aa'
		});
	});

	it('deletes a Pane, unsubscribes it, and persists the Workspace', () => {
		const panes = paneState(branch(PaneSplit.VERTICAL, leaf('a'), leaf('b')));
		const runtime = new WorkspaceRuntime(panes, factory());
		const onChange = vi.fn();

		runtime.subscribe(onChange);

		expect(runtime.deletePane('b')).toEqual({
			deletedPaneID: 'b'
		});

		expect(panes.unsubscribeFromPaneDimensions).toHaveBeenCalledWith('b');
		expect(panes.save).toHaveBeenCalledOnce();
		expect(onChange).toHaveBeenCalledWith({
			type: WorkspaceChangeType.PANE_DELETED,
			deletedPaneID: 'b'
		});
		expect(panes.rootPane.id).toBe('a');
	});

	it('replaces a normal module with Modules without deleting the sole Pane', () => {
		const originalBuffer = buffer(Modules.BIBLE);
		const modulesBuffer = buffer(Modules.MODULES);
		const panes = paneState(leaf('a', originalBuffer));
		const related = vi.fn(() => modulesBuffer);
		const runtime = new WorkspaceRuntime(panes, {
			independent: vi.fn(),
			related,
			reconcileRestored: vi.fn()
		});
		const onChange = vi.fn();

		runtime.subscribe(onChange);

		expect(runtime.closePane('a')).toBe(true);
		expect(related).toHaveBeenCalledWith(Modules.MODULES, originalBuffer, {});
		expect(panes.rootPane.buffer).toBe(modulesBuffer);
		expect(panes.rootPane.toggle).toBe(true);
		expect(panes.save).toHaveBeenCalledOnce();
		expect(onChange).toHaveBeenCalledWith({
			type: WorkspaceChangeType.PANE_BUFFER_REPLACED,
			paneID: 'a'
		});
		expect(panes.unsubscribeFromPaneDimensions).not.toHaveBeenCalled();
	});

	it('replaces a normal module with Modules without changing a split Workspace', () => {
		const originalBuffer = buffer(Modules.NOTES);
		const modulesBuffer = buffer(Modules.MODULES);
		const panes = paneState(
			branch(PaneSplit.HORIZONTAL, leaf('a'), leaf('b', originalBuffer))
		);
		const related = vi.fn(() => modulesBuffer);
		const runtime = new WorkspaceRuntime(panes, {
			independent: vi.fn(),
			related,
			reconcileRestored: vi.fn()
		});

		expect(runtime.closePane('b')).toBe(true);
		expect(related).toHaveBeenCalledWith(Modules.MODULES, originalBuffer, {});
		expect(panes.rootPane.split).toBe(PaneSplit.HORIZONTAL);
		expect(panes.rootPane.left?.id).toBe('a');
		expect(panes.rootPane.right?.id).toBe('b');
		expect(panes.rootPane.right?.buffer).toBe(modulesBuffer);
		expect(panes.unsubscribeFromPaneDimensions).not.toHaveBeenCalled();
	});

	it('deletes a Modules Pane when another Pane exists', () => {
		const panes = paneState(
			branch(PaneSplit.VERTICAL, leaf('a'), leaf('b', buffer(Modules.MODULES)))
		);
		const runtime = new WorkspaceRuntime(panes, factory());

		expect(runtime.closePane('b')).toBe(true);
		expect(panes.rootPane.id).toBe('a');
		expect(panes.rootPane.split).toBeUndefined();
		expect(panes.unsubscribeFromPaneDimensions).toHaveBeenCalledWith('b');
	});

	it('keeps the final Modules Pane unchanged', () => {
		const modulesBuffer = buffer(Modules.MODULES);
		const panes = paneState(leaf('a', modulesBuffer));
		const related = vi.fn();
		const runtime = new WorkspaceRuntime(panes, {
			independent: vi.fn(),
			related,
			reconcileRestored: vi.fn()
		});
		const onChange = vi.fn();

		runtime.subscribe(onChange);

		expect(runtime.closePane('a')).toBe(true);
		expect(panes.rootPane.buffer).toBe(modulesBuffer);
		expect(related).not.toHaveBeenCalled();
		expect(panes.save).not.toHaveBeenCalled();
		expect(panes.unsubscribeFromPaneDimensions).not.toHaveBeenCalled();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('stops publishing changes after a Workspace subscriber unsubscribes', () => {
		const panes = paneState(leaf('a'));
		const runtime = new WorkspaceRuntime(panes, factory());
		const onChange = vi.fn();
		const unsubscribe = runtime.subscribe(onChange);

		unsubscribe();
		runtime.closePane('a');

		expect(onChange).not.toHaveBeenCalled();
	});

	it('does not persist when the target Pane does not exist', () => {
		const panes = paneState(leaf('a'));
		const runtime = new WorkspaceRuntime(panes, factory());

		expect(runtime.deletePane('missing')).toBeUndefined();
		expect(runtime.replaceBuffer('missing', Modules.BIBLE)).toBe(false);
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

function factory() {
	return {
		independent: () => buffer(Modules.BIBLE),
		related: () => buffer(Modules.BIBLE),
		reconcileRestored: vi.fn()
	};
}

function leaf(
	id: string,
	bufferValue: Buffer | undefined = buffer(Modules.BIBLE),
	toggle?: boolean
): Pane {
	return {
		id,
		split: undefined,
		left: undefined,
		right: undefined,
		buffer: bufferValue,
		toggle
	};
}

function emptyLeaf(id: string): Pane {
	return {
		id,
		split: undefined,
		left: undefined,
		right: undefined,
		buffer: undefined,
		toggle: undefined
	};
}

function branch(split: PaneSplit, left: Pane, right: Pane): Pane {
	return {
		id: undefined,
		split,
		left,
		right,
		buffer: undefined
	};
}

function buffer(module: Modules): Buffer {
	const value = new Buffer({});

	value.componentName = module;

	return value;
}

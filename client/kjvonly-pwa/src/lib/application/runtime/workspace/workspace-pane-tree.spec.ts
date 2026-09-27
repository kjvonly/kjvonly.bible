import {
	describe,
	expect,
	it
} from 'vitest';

import {
	PaneSplit
} from '$lib/application/runtime/pane/models/pane-split';

import type {
	PaneState
} from '$lib/application/runtime/pane/models/pane-state.model';

import type {
	Pane
} from '$lib/application/runtime/pane/models/pane.model';

import {
	deletePane,
	findPane,
	splitPane
} from './workspace-pane-tree';

describe(
	'Workspace Pane tree',
	() => {
		it(
			'finds root and nested Panes by stable id',
			() => {
				const root =
					branch(
						PaneSplit.VERTICAL,
						leaf('a'),
						branch(
							PaneSplit.HORIZONTAL,
							leaf('b'),
							leaf('c')
						)
					);

				expect(findPane(root, 'a')?.id).toBe('a');
				expect(findPane(root, 'c')?.id).toBe('c');
				expect(findPane(root, 'missing')).toBeUndefined();
			}
		);

		it(
			'splits a leaf while preserving its state on the left',
			() => {
				const originalState =
					state('original');
				const relatedState =
					state('related');
				const root =
					leaf('a', originalState);

				expect(
					splitPane({
						rootPane: root,
						paneID: 'a',
						newPaneID: 'b',
						split: PaneSplit.VERTICAL,
						state: relatedState
					})
				).toBe(true);

				expect(root.id).toBeUndefined();
				expect(root.state).toBeUndefined();
				expect(root.split).toBe(PaneSplit.VERTICAL);
				expect(root.left).toMatchObject({
					id: 'a',
					state: originalState
				});
				expect(root.right).toMatchObject({
					id: 'b',
					state: relatedState
				});
			}
		);

		it(
			'returns false when splitting an unknown Pane',
			() => {
				const root = leaf('a');

				expect(
					splitPane({
						rootPane: root,
						paneID: 'missing',
						newPaneID: 'b',
						split: PaneSplit.HORIZONTAL,
						state: state('related')
					})
				).toBe(false);

				expect(root.id).toBe('a');
			}
		);

		it(
			'deletes a left leaf by collapsing its right sibling into the parent',
			() => {
				const rightState = state('right');
				const root = branch(
					PaneSplit.VERTICAL,
					leaf('a'),
					leaf('b', rightState)
				);

				expect(deletePane(root, 'a')).toEqual({
					deletedPaneID: 'a'
				});

				expect(root.id).toBe('b');
				expect(root.state).toBe(rightState);
				expect(root.split).toBeUndefined();
				expect(root.left).toBeUndefined();
				expect(root.right).toBeUndefined();
			}
		);

		it(
			'deletes a right leaf by collapsing its left sibling into the parent',
			() => {
				const leftState = state('left');
				const root = branch(
					PaneSplit.HORIZONTAL,
					leaf('a', leftState),
					leaf('b')
				);

				expect(deletePane(root, 'b')).toEqual({
					deletedPaneID: 'b'
				});

				expect(root.id).toBe('a');
				expect(root.state).toBe(leftState);
				expect(root.split).toBeUndefined();
			}
		);

		it(
			'promotes a sibling branch without collapsing unrelated nested Panes',
			() => {
				const root = branch(
					PaneSplit.VERTICAL,
					leaf('a'),
					branch(
						PaneSplit.HORIZONTAL,
						leaf('b'),
						leaf('c')
					)
				);

				expect(deletePane(root, 'a')).toEqual({
					deletedPaneID: 'a'
				});

				expect(root.split).toBe(PaneSplit.HORIZONTAL);
				expect(root.state).toBeUndefined();
				expect(root.left?.id).toBe('b');
				expect(root.right?.id).toBe('c');
			}
		);

		it(
			'promotes a left sibling branch when deleting the right leaf',
			() => {
				const root = branch(
					PaneSplit.VERTICAL,
					branch(
						PaneSplit.HORIZONTAL,
						leaf('a'),
						leaf('b')
					),
					leaf('c')
				);

				expect(deletePane(root, 'c')).toEqual({
					deletedPaneID: 'c'
				});

				expect(root.split).toBe(PaneSplit.HORIZONTAL);
				expect(root.state).toBeUndefined();
				expect(root.left?.id).toBe('a');
				expect(root.right?.id).toBe('b');
			}
		);

		it(
			'collapses only the immediate parent when deleting a nested Pane',
			() => {
				const root = branch(
					PaneSplit.VERTICAL,
					leaf('a'),
					branch(
						PaneSplit.HORIZONTAL,
						leaf('b'),
						leaf('c')
					)
				);

				expect(deletePane(root, 'b')).toEqual({
					deletedPaneID: 'b'
				});

				expect(root.split).toBe(PaneSplit.VERTICAL);
				expect(root.left?.id).toBe('a');
				expect(root.right?.id).toBe('c');
			}
		);

		it(
			'leaves the sole root leaf for the Workspace to retain instead of structurally deleting it',
			() => {
				const root = leaf('a');

				expect(deletePane(root, 'a')).toBeUndefined();
				expect(root.id).toBe('a');
			}
		);
	}
);

function leaf(
	id: string,
	stateValue: PaneState = state(id)
): Pane {
	return {
		id,
		split: undefined,
		left: undefined,
		right: undefined,
		state: stateValue
	};
}

function branch(
	split: PaneSplit,
	left: Pane,
	right: Pane
): Pane {
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

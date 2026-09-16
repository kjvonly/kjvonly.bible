import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	PaneSplit
} from '$lib/application/runtime/pane/models/pane-split';

import type {
	Pane
} from '$lib/application/runtime/pane/models/pane.model';

import type {
	Buffer
} from '$lib/application/runtime/buffer/models/buffer.model';

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

				expect(
					findPane(
						root,
						'a'
					)?.id
				).toBe('a');

				expect(
					findPane(
						root,
						'c'
					)?.id
				).toBe('c');

				expect(
					findPane(
						root,
						'missing'
					)
				).toBeUndefined();
			}
		);

		it(
			'splits a leaf while preserving its Buffer and Pane behavior on the left',
			() => {
				const updateBuffer =
					vi.fn();
				const originalBuffer =
					buffer('original');
				const relatedBuffer =
					buffer('related');
				const root =
					leaf(
						'a',
						originalBuffer,
						updateBuffer,
						true
					);

				expect(
					splitPane({
						rootPane:
							root,
						paneID:
							'a',
						newPaneID:
							'b',
						split:
							PaneSplit.VERTICAL,
						buffer:
							relatedBuffer
					})
				).toBe(true);

				expect(root.id).toBeUndefined();
				expect(root.split).toBe(
					PaneSplit.VERTICAL
				);
				expect(root.left).toMatchObject({
					id:
						'a',
					buffer:
						originalBuffer,
					updateBuffer,
					toggle:
						true
				});
				expect(root.right).toMatchObject({
					id:
						'b',
					buffer:
						relatedBuffer
				});
			}
		);

		it(
			'returns false when splitting an unknown Pane',
			() => {
				const root =
					leaf('a');

				expect(
					splitPane({
						rootPane:
							root,
						paneID:
							'missing',
						newPaneID:
							'b',
						split:
							PaneSplit.HORIZONTAL,
						buffer:
							buffer('related')
					})
				).toBe(false);

				expect(root.id).toBe('a');
			}
		);

		it(
			'deletes a left leaf by collapsing its right sibling into the parent',
			() => {
				const rightBuffer =
					buffer('right');
				const root =
					branch(
						PaneSplit.VERTICAL,
						leaf('a'),
						leaf(
							'b',
							rightBuffer
						)
					);

				expect(
					deletePane(
						root,
						'a'
					)
				).toEqual({
					deletedPaneID:
						'a'
				});

				expect(root.id).toBe('b');
				expect(root.buffer).toBe(
					rightBuffer
				);
				expect(root.split).toBeUndefined();
				expect(root.left).toBeUndefined();
				expect(root.right).toBeUndefined();
			}
		);

		it(
			'deletes a right leaf by collapsing its left sibling into the parent',
			() => {
				const leftBuffer =
					buffer('left');
				const root =
					branch(
						PaneSplit.HORIZONTAL,
						leaf(
							'a',
							leftBuffer
						),
						leaf('b')
					);

				expect(
					deletePane(
						root,
						'b'
					)
				).toEqual({
					deletedPaneID:
						'b'
				});

				expect(root.id).toBe('a');
				expect(root.buffer).toBe(
					leftBuffer
				);
				expect(root.split).toBeUndefined();
			}
		);

		it(
			'promotes a sibling branch without collapsing unrelated nested Panes',
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

				expect(
					deletePane(
						root,
						'a'
					)
				).toEqual({
					deletedPaneID:
						'a'
				});

				expect(root.split).toBe(
					PaneSplit.HORIZONTAL
				);
				expect(root.left?.id).toBe('b');
				expect(root.right?.id).toBe('c');
			}
		);

		it(
			'promotes a left sibling branch when deleting the right leaf',
			() => {
				const root =
					branch(
						PaneSplit.VERTICAL,
						branch(
							PaneSplit.HORIZONTAL,
							leaf('a'),
							leaf('b')
						),
						leaf('c')
					);

			expect(
					deletePane(
						root,
						'c'
					)
				).toEqual({
					deletedPaneID:
						'c'
				});

			expect(root.split).toBe(
					PaneSplit.HORIZONTAL
				);
			expect(root.left?.id).toBe('a');
			expect(root.right?.id).toBe('b');
			}
		);

		it(
			'collapses only the immediate parent when deleting a nested Pane',
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

				expect(
					deletePane(
						root,
						'b'
					)
				).toEqual({
					deletedPaneID:
						'b'
				});

				expect(root.split).toBe(
					PaneSplit.VERTICAL
				);
				expect(root.left?.id).toBe('a');
				expect(root.right?.id).toBe('c');
			}
		);

		it(
			'leaves the sole root leaf for the Workspace to replace instead of structurally deleting it',
			() => {
				const root =
					leaf('a');

				expect(
					deletePane(
						root,
						'a'
					)
				).toBeUndefined();

				expect(root.id).toBe('a');
			}
		);
	}
);

function leaf(
	id: string,
	bufferValue: Buffer = buffer(id),
	updateBuffer: Function | undefined = undefined,
	toggle: boolean | undefined = undefined
): Pane {
	return {
		id,
		split:
			undefined,
		left:
			undefined,
		right:
			undefined,
		buffer:
			bufferValue,
		updateBuffer,
		toggle
	};
}

function branch(
	split: PaneSplit,
	left: Pane,
	right: Pane
): Pane {
	return {
		id:
			undefined,
		split,
		left,
		right,
		buffer:
			undefined,
		updateBuffer:
			undefined,
		toggle:
			undefined
	};
}

function buffer(
	name: string
): Buffer {
	return {
		name
	} as Buffer;
}

import {
	describe,
	expect,
	it
} from 'vitest';

import { PaneSplit } from '$lib/application/runtime/pane/models/pane-split';
import type { Pane } from '$lib/application/runtime/pane/models/pane.model';

import {
	deriveWorkspaceLayout,
	sortPaneIDs
} from './workspace-layout';

describe(
	'deriveWorkspaceLayout',
	() => {
		it(
			'derives pane ids, CSS grid template, and dimensions for a vertical split',
			() => {
				const layout =
					deriveWorkspaceLayout(
						branch(
							PaneSplit.VERTICAL,
							leaf('a'),
							leaf('b')
						)
					);

				expect(
					layout.activePaneIDs
				).toEqual([
					'a',
					'b'
				]);
				expect(
					layout.paneDimensionsByID
				).toEqual({
					a: {
						height: 1,
						width: 0.5
					},
					b: {
						height: 1,
						width: 0.5
					}
				});
				expect(
					layout.template
				).toContain(
					'grid-template-columns: repeat(2, 1fr);'
				);
				expect(
					layout.template
				).toContain(
					'"a b"'
				);
			}
		);

		it(
			'derives proportional dimensions from nested pane splits',
			() => {
				const layout =
					deriveWorkspaceLayout(
						branch(
							PaneSplit.VERTICAL,
							branch(
								PaneSplit.HORIZONTAL,
								leaf('a'),
								branch(
									PaneSplit.HORIZONTAL,
									leaf('d'),
									leaf('e')
								)
							),
							branch(
								PaneSplit.HORIZONTAL,
								leaf('b'),
								leaf('c')
							)
						)
					);

				expect(
					layout.gridTemplateAreas
				).toEqual([
					['a', 'b'],
					['a', 'b'],
					['d', 'c'],
					['e', 'c']
				]);
				expect(
					layout.paneDimensionsByID
				).toEqual({
					a: {
						height: 0.5,
						width: 0.5
					},
					b: {
						height: 0.5,
						width: 0.5
					},
					c: {
						height: 0.5,
						width: 0.5
					},
					d: {
						height: 0.25,
						width: 0.5
					},
					e: {
						height: 0.25,
						width: 0.5
					}
				});
			}
		);

		it(
			'sorts pane ids by their numeric pane identity',
			() => {
				const layout =
					deriveWorkspaceLayout(
						branch(
							PaneSplit.VERTICAL,
							leaf('aa'),
							leaf('z')
						)
					);

				expect(
					layout.activePaneIDs
				).toEqual([
					'z',
					'aa'
				]);
			}
		);
		it(
			'sorts retained pane ids with active pane ids using pane identity order',
			() => {
				expect(
					sortPaneIDs([
						'aa',
						'b',
						'z',
						'a'
					])
				).toEqual([
					'a',
					'b',
					'z',
					'aa'
				]);
			}
		);

	}
);

function leaf(
	id: string
): Pane {
	return {
		id,
		split:
			undefined,
		left:
			undefined,
		right:
			undefined,
		state:
			undefined
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
		state:
			undefined
	};
}

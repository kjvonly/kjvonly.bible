import {
	describe,
	expect,
	it
} from 'vitest';

import {
	PaneSplit
} from '$lib/application/runtime/pane/models/pane-split';

import {
	base26ToDecimal,
	numberToLetters,
	renderGridTemplateAreas,
	renderGridTemplateColumns
} from './dynamicGrid.service';

type GridPane = {
	id?: string;
	split?: PaneSplit;
	left?: GridPane;
	right?: GridPane;
};

describe(
	'dynamic grid',
	() => {
		it(
			'renders a vertical split as side-by-side grid areas',
			() => {
				const grid =
					renderGridTemplateAreas(
						vertical(
							leaf('a'),
							leaf('b')
						)
					);

				expect(grid).toEqual([
					['a', 'b']
				]);
			}
		);

		it(
			'renders a horizontal split as stacked grid areas',
			() => {
				const grid =
					renderGridTemplateAreas(
						horizontal(
							leaf('a'),
							leaf('b')
						)
					);

				expect(grid).toEqual([
					['a'],
					['b']
				]);
			}
		);

		it(
			'subdivides only the pane being split',
			() => {
				const grid =
					renderGridTemplateAreas(
						vertical(
							horizontal(
								leaf('a'),
								horizontal(
									leaf('d'),
									leaf('e')
								)
							),
							horizontal(
								leaf('b'),
								leaf('c')
							)
						)
					);

				expect(grid).toEqual([
					['a', 'b'],
					['a', 'b'],
					['d', 'c'],
					['e', 'c']
				]);
			}
		);

		it(
			'renders balanced nested horizontal splits without inventing panes',
			() => {
				const grid =
					renderGridTemplateAreas(
						vertical(
							horizontal(
								leaf('a'),
								leaf('d')
							),
							horizontal(
								leaf('b'),
								leaf('c')
							)
						)
					);

				expect(grid).toEqual([
					['a', 'b'],
					['d', 'c']
				]);
			}
		);

		it(
			'normalizes complex child grids for a vertical split',
			() => {
				const grid =
					renderGridTemplateAreas(
						vertical(
							complexGrid('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'),
							complexGrid('i', 'j', 'k', 'l', 'm', 'n', 'o', 'p')
						)
					);

				expect(grid).toEqual([
					['a', 'a', 'a', 'a', 'b', 'b', 'c', 'd', 'i', 'i', 'i', 'i', 'j', 'j', 'k', 'l'],
					['a', 'a', 'a', 'a', 'e', 'e', 'e', 'e', 'i', 'i', 'i', 'i', 'm', 'm', 'm', 'm'],
					['f', 'f', 'f', 'f', 'f', 'f', 'f', 'f', 'n', 'n', 'n', 'n', 'n', 'n', 'n', 'n'],
					['g', 'g', 'g', 'g', 'h', 'h', 'h', 'h', 'o', 'o', 'o', 'o', 'p', 'p', 'p', 'p']
				]);
			}
		);

		it(
			'normalizes complex child grids for a horizontal split',
			() => {
				const grid =
					renderGridTemplateAreas(
						horizontal(
							complexGrid('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'),
							complexGrid('i', 'j', 'k', 'l', 'm', 'n', 'o', 'p')
						)
					);

				expect(grid).toEqual([
					['a', 'a', 'a', 'a', 'b', 'b', 'c', 'd'],
					['a', 'a', 'a', 'a', 'e', 'e', 'e', 'e'],
					['f', 'f', 'f', 'f', 'f', 'f', 'f', 'f'],
					['g', 'g', 'g', 'g', 'h', 'h', 'h', 'h'],
					['i', 'i', 'i', 'i', 'j', 'j', 'k', 'l'],
					['i', 'i', 'i', 'i', 'm', 'm', 'm', 'm'],
					['n', 'n', 'n', 'n', 'n', 'n', 'n', 'n'],
					['o', 'o', 'o', 'o', 'p', 'p', 'p', 'p']
				]);
			}
		);

		it(
			'renders one equal-width CSS column for each grid column',
			() => {
				expect(
					renderGridTemplateColumns([
						['a', 'b', 'c'],
						['d', 'e', 'f']
					])
				).toBe('repeat(3, 1fr)');
			}
		);

		it(
			'converts pane ids between one-based numbers and letters',
			() => {
				const values = [
					1,
					26,
					27,
					52,
					53,
					702,
					703
				];

				expect(
					values.map(numberToLetters)
				).toEqual([
					'a',
					'z',
					'aa',
					'az',
					'ba',
					'zz',
					'aaa'
				]);

				for (const value of values) {
					expect(
						base26ToDecimal(
							numberToLetters(value)
						)
					).toBe(value);
				}
			}
		);
	}
);

function leaf(
	id: string
): GridPane {
	return {
		id
	};
}

function horizontal(
	top: GridPane,
	bottom: GridPane
): GridPane {
	return {
		split:
			PaneSplit.HORIZONTAL,
		left:
			top,
		right:
			bottom
	};
}

function vertical(
	left: GridPane,
	right: GridPane
): GridPane {
	return {
		split:
			PaneSplit.VERTICAL,
		left,
		right
	};
}

function complexGrid(
	a: string,
	b: string,
	c: string,
	d: string,
	e: string,
	f: string,
	g: string,
	h: string
): GridPane {
	return horizontal(
		vertical(
			leaf(a),
			horizontal(
				vertical(
					leaf(b),
					vertical(
						leaf(c),
						leaf(d)
					)
				),
				leaf(e)
			)
		),
		horizontal(
			leaf(f),
			vertical(
				leaf(g),
				leaf(h)
			)
		)
	);
}

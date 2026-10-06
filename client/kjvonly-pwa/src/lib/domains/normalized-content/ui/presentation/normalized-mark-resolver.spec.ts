import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NORMALIZED_MARK_PRESENTATIONS,
	resolveNormalizedMarks
} from './normalized-mark-resolver';

describe(
	'resolveNormalizedMarks',
	() => {
		it(
			'maps small to the semantic small element',
			() => {
				expect(
					resolveNormalizedMarks([
						'small'
					])
				).toEqual([
					{
						mark:
							'small',
						element:
							'small'
					}
				]);
			}
		);

		it(
			'maps superscript to the semantic sup element',
			() => {
				expect(
					resolveNormalizedMarks([
						'superscript'
					])
				).toEqual([
					{
						mark:
							'superscript',
						element:
							'sup'
					}
				]);
			}
		);

		it(
			'normalizes multiple marks to deterministic wrapper order',
			() => {
				expect(
					resolveNormalizedMarks([
						'small',
						'superscript'
					])
				).toEqual([
					{
						mark:
							'superscript',
						element:
							'sup'
					},
					{
						mark:
							'small',
						element:
							'small'
					}
				]);

				expect(
					NORMALIZED_MARK_PRESENTATIONS.map(
						(presentation) =>
							presentation.mark
					)
				).toEqual([
					'superscript',
					'small'
				]);
			}
		);

		it(
			'deduplicates marks and ignores unknown presentation hints',
			() => {
				expect(
					resolveNormalizedMarks([
						'small',
						'publisher-mark',
						'small',
						'superscript'
					]).map(
						(presentation) =>
							presentation.mark
					)
				).toEqual([
					'superscript',
					'small'
				]);
			}
		);

		it.each([
			undefined,
			null,
			[]
		])(
			'returns no marks when no supported mark is present',
			(marks) => {
				expect(
					resolveNormalizedMarks(
						marks
					)
				).toEqual([]);
			}
		);
	}
);

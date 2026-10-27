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
		it.each([
			[
				'superscript',
				'sup'
			],
			[
				'subscript',
				'sub'
			],
			[
				'underline',
				'u'
			],
			[
				'strikethrough',
				's'
			],
			[
				'small',
				'small'
			],
			[
				'code',
				'code'
			],
			[
				'highlight',
				'mark'
			]
		] as const)(
			'maps %s to the semantic %s element',
			(
				mark,
				element
			) => {
				expect(
					resolveNormalizedMarks([
						mark
					])
				).toEqual([
					{
						mark,
						element
					}
				]);
			}
		);

		it(
			'normalizes multiple marks to canonical deterministic wrapper order',
			() => {
				expect(
					resolveNormalizedMarks([
						'highlight',
						'underline',
						'superscript',
						'code'
					]).map(
						(presentation) =>
							presentation.mark
					)
			).toEqual([
					'superscript',
					'underline',
					'code',
					'highlight'
				]);
		}
		);

		it(
			'exposes every canonical mark in shared vocabulary order',
			() => {
				expect(
					NORMALIZED_MARK_PRESENTATIONS.map(
						(presentation) =>
							presentation.mark
					)
			).toEqual([
					'superscript',
					'subscript',
					'underline',
					'strikethrough',
					'small',
					'code',
					'highlight'
				]);
		}
		);

		it.each([
			undefined,
			[]
		] as const)(
			'returns no marks when no canonical mark is present',
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

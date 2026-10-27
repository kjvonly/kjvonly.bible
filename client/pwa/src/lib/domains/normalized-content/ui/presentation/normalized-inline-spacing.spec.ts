import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NormalizedContent
} from '@kjvonly/normalized-content';

import {
	shouldInsertNormalizedWordSeparator
} from './normalized-inline-spacing';

describe(
	'shouldInsertNormalizedWordSeparator',
	() => {
		it.each([
			{
				name:
					'ordinary adjacent words',
				content: [
					word(
						'one'
					),
					word(
						'two'
					)
				] as NormalizedContent[],
				index: 1,
				expected: true
			},
			{
				name:
					'joinPrevious',
				content: [
					word(
						'K'
					),
					word(
						'JV',
						true
					)
				] as NormalizedContent[],
				index: 1,
				expected: false
			},
			{
				name:
					'ordinary words separated by a zero-width anchor',
				content: [
					word(
						'one'
					),
					anchor(),
					word(
						'two'
					)
				] as NormalizedContent[],
				index: 2,
				expected: true
			},
			{
				name:
					'joinPrevious across a zero-width anchor',
				content: [
					word(
						'K'
					),
					anchor(),
					word(
						'JV',
						true
					)
				] as NormalizedContent[],
				index: 2,
				expected: false
			},
			{
				name:
					'an explicit line-break boundary',
				content: [
					word(
						'first'
					),
					{
						type:
							'line-break'
					},
					word(
						'second'
					)
				] as NormalizedContent[],
				index: 2,
				expected: false
			},
			{
				name:
					'the first visible word',
				content: [
					word(
						'first'
					)
				] as NormalizedContent[],
				index: 0,
				expected: false
			}
		])(
			'returns $expected for $name',
			({
				content,
				index,
				expected
			}) => {
				expect(
					shouldInsertNormalizedWordSeparator(
						content,
						index
					)
				).toBe(
					expected
				);
			}
		);
	}
);

/** Creates one canonical word fixture for focused spacing tests. */
function word(
	text: string,
	joinPrevious = false
): NormalizedContent {
	return joinPrevious
		? {
			type:
				'word',
			text,
			joinPrevious:
				true
		}
		: {
			type:
				'word',
			text
		};
}

/** Creates one zero-width canonical anchor fixture. */
function anchor(): NormalizedContent {
	return {
		type:
			'anchor',
		id:
			'inline-anchor'
	};
}

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	alphabeticSequenceToNumber,
	numberToAlphabeticSequence
} from './alphabetic-sequence';

describe(
	'alphabetic sequence',
	() => {
		it(
			'converts positive one-based numbers to alphabetic sequences',
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
					values.map(
						numberToAlphabeticSequence
					)
				).toEqual([
					'a',
					'z',
					'aa',
					'az',
					'ba',
					'zz',
					'aaa'
				]);
			}
		);

		it(
			'round trips alphabetic sequences and their one-based numbers',
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

				for (const value of values) {
					expect(
						alphabeticSequenceToNumber(
							numberToAlphabeticSequence(value)
						)
					).toBe(value);
				}
			}
		);
	}
);

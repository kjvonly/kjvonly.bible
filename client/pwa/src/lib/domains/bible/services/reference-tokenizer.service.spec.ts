import {
	describe,
	expect,
	it
} from 'vitest';

import {
	isCrossReference,
	isFootnoteReference,
	isStrongsReference,
	tokenizeReferences
} from './reference-tokenizer.service';

describe(
	'reference tokenizer',
	() => {
		it(
			'splits mixed Strong\'s and Bible references into atomic tokens',
			() => {
				expect(
					tokenizeReferences([
						'H6529;1/2/16;1/2/17'
					])
				).toEqual([
					'H6529',
					'1/2/16',
					'1/2/17'
				]);
			}
		);

		it(
			'preserves already atomic references and removes empty tokens',
			() => {
				expect(
					tokenizeReferences([
						'G3056',
						' 47/5/3 ; ; 47/5/4 '
					])
				).toEqual([
					'G3056',
					'47/5/3',
					'47/5/4'
				]);
			}
		);

		it(
			'classifies only complete Strong\'s references',
			() => {
				expect(isStrongsReference('H6529')).toBe(true);
				expect(isStrongsReference('g3056')).toBe(true);
				expect(
					isStrongsReference(
						'H6529;1/2/16'
					)
				).toBe(false);
			}
		);

		it(
			'classifies only complete Bible cross references',
			() => {
				expect(isCrossReference('1/2/16')).toBe(true);
				expect(
					isCrossReference(
						'H6529;1/2/16'
					)
				).toBe(false);
			}
		);

		it(
			'classifies only complete footnote references',
			() => {
				expect(isFootnoteReference('1_2_16')).toBe(true);
				expect(
					isFootnoteReference(
						'1_2_16;H6529'
					)
				).toBe(false);
			}
		);
	}
);

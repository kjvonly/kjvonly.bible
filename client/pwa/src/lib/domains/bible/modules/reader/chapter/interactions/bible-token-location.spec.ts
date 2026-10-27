import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createBibleTokenLocationRef
} from './bible-token-location';

describe(
	'createBibleTokenLocationRef',
	() => {
		it(
			'creates an exact word location from the active chapter',
			() => {
				expect(
					createBibleTokenLocationRef(
						'43_3',
						{
							verseNumber: 16,
							wordIndex: 7
						}
					)
				).toBe('43_3_16_7');
			}
		);

		it(
			'creates a verse location from a verse-number target',
			() => {
				expect(
					createBibleTokenLocationRef(
						'43_3',
						{
							verseNumber: 16,
							wordIndex: 0
						}
					)
				).toBe('43_3_16_0');
			}
		);

		it(
			'rejects an invalid negative word index',
			() => {
				expect(() =>
					createBibleTokenLocationRef(
						'43_3',
						{
							verseNumber: 16,
							wordIndex: -1
						}
					)
				).toThrow(
					'Invalid Bible token location'
				);
			}
		);
	}
);

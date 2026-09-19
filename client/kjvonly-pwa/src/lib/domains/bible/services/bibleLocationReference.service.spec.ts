import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BibleLocationReferenceService
} from './bibleLocationReference.service';

describe(
	'BibleLocationReferenceService',
	() => {
		const service =
			new BibleLocationReferenceService();

		it(
			'extracts book and chapter from versioned and unversioned references',
			() => {
				expect(
					service.extractBookID(
						'1_2_3_4'
					)
				).toBe('1');

				expect(
					service.extractBookID(
						'kjv/1_2_3_4'
					)
				).toBe('1');

				expect(
					service.extractChapter(
						'kjv/1_2_3_4'
					)
				).toBe(2);
			}
		);

		it(
			'extracts version and location independently',
			() => {
				expect(
					service.extractVersion(
						'kjv/1_2_3_4'
					)
				).toBe('kjv');

				expect(
					service.extractVersion(
						'1_2_3_4'
					)
				).toBeUndefined();

				expect(
					service.extractLocationRef(
						'kjv/1_2_3_4'
					)
				).toBe('1_2_3_4');
			}
		);

		it(
			'reduces references to book and chapter while preserving the version only when requested',
			() => {
				expect(
					service.extractBookIDChapter(
						'kjv/1_2_3_4'
					)
				).toBe('1_2');

				expect(
					service.extractVersionBookIDChapter(
						'kjv/1_2_3_4'
					)
				).toBe('kjv/1_2');

				expect(
					service.extractVersionBookIDChapter(
						'1_2_3_4'
					)
				).toBe('1_2');
			}
		);

		it(
			'extracts verse ranges from versioned and unversioned references',
			() => {
				expect(
					service.extractVersesOrOne(
						'1_2_3-5'
					)
				).toEqual([2, 5]);

				expect(
					service.extractVersesOrOne(
						'kjv/1_2_3-5'
					)
				).toEqual([2, 5]);

				expect(
					service.extractVersesOrOne(
						'1_2_3'
					)
				).toEqual([0, 0]);
			}
		);

		it(
			'extracts verse and word-index detail from versioned references',
			() => {
				expect(
					service.extractVerse(
						'kjv/1_2_3-5_7'
					)
				).toBe(3);

				expect(
					service.extractWordIndexOrDefault(
						'kjv/1_2_3_7'
					)
				).toBe('7');

				expect(
					service.extractWordIndexOrDefault(
						'kjv/1_2_3',
						'9'
					)
				).toBe('9');
			}
		);

		it(
			'detects verse detail independently of an optional version',
			() => {
				expect(
					service.hasVerse(
						'kjv/1_2_3'
					)
				).toBe(true);

				expect(
					service.hasVerse(
						'kjv/1_2'
					)
				).toBe(false);
			}
		);

		it(
			'converts cross references and creates Bible location references',
			() => {
				expect(
					service.convertCrossRefToBibleLocationRef(
						'47/5/3'
					)
				).toBe('47_5_3');

				expect(
					service.makeBibleLocationRef(
						'47',
						5,
						3
					)
				).toBe('47_5_3');
			}
		);
	}
);

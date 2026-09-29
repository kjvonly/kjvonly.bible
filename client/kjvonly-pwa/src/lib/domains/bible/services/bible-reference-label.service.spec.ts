import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BCV
} from '../models/bible.model';

import {
	BibleReferenceLabelService,
	type BibleChapterVerseCountLookup
} from './bible-reference-label.service';

const VERSE_COUNTS:
	BibleChapterVerseCountLookup = {
		'1': {
			'1': 31,
			'2': 25
		},
		'42': {
			'1': 80
		},
		'99': {
			'1': 1
		}
	};

const service =
	new BibleReferenceLabelService();

function createBCV(
	overrides: Partial<BCV> = {}
): BCV {
	return {
		bookName: 'Genesis',
		bookID: 1,
		chapter: 1,
		verses: '1-31',
		bibleLocationRef: '1_1_1-31',
		...overrides
	};
}

describe(
	'BibleReferenceLabelService',
	() => {
		it(
			'omits verses for a whole-chapter range',
			() => {
				expect(
					service.format(
						createBCV(),
						VERSE_COUNTS
					)
				).toBe(
					'Genesis 1'
				);
			}
		);

		it(
			'omits verses when a one-verse chapter is read in full',
			() => {
				expect(
					service.format(
						createBCV({
							bookName: 'Test',
							bookID: 99,
							verses: '1'
						}),
						VERSE_COUNTS
					)
				).toBe(
					'Test 1'
				);
			}
		);

		it(
			'keeps verses when the reading ends before the chapter ends',
			() => {
				expect(
					service.format(
						createBCV({
							verses: '1-30'
						}),
						VERSE_COUNTS
					)
				).toBe(
					'Genesis 1:1-30'
				);
			}
		);

		it(
			'keeps verses when the reading starts after verse one',
			() => {
				expect(
					service.format(
						createBCV({
							verses: '2-31'
						}),
						VERSE_COUNTS
					)
				).toBe(
					'Genesis 1:2-31'
				);
			}
		);

		it(
			'keeps verses when chapter metadata is unavailable',
			() => {
				expect(
					service.format(
						createBCV({
							bookName: 'Unknown',
							bookID: 500,
							chapter: 3,
							verses: '1-10'
						}),
						VERSE_COUNTS
					)
				).toBe(
					'Unknown 3:1-10'
				);
			}
		);

		it(
			'uses an alternate display book name when supplied',
			() => {
				expect(
					service.format(
						createBCV({
							bookName: 'Song of Solomon',
							verses: '1-31'
						}),
						VERSE_COUNTS,
						'Song'
					)
				).toBe(
					'Song 1'
				);
			}
		);

		it(
			'uses the selected chapter metadata for each book and chapter',
			() => {
				expect(
					service.format(
						createBCV({
							bookName: 'Luke',
							bookID: 42,
							chapter: 1,
							verses: '1-80'
						}),
						VERSE_COUNTS
					)
				).toBe(
					'Luke 1'
				);
			}
		);
	}
);

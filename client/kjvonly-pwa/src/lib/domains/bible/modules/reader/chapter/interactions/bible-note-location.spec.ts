import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createBibleNoteLocationRef
} from './bible-note-location';

describe(
	'createBibleNoteLocationRef',
	() => {
		it(
			'creates an exact word location from the active chapter',
			() => {
				expect(
					createBibleNoteLocationRef(
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
					createBibleNoteLocationRef(
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
					createBibleNoteLocationRef(
						'43_3',
						{
							verseNumber: 16,
							wordIndex: -1
						}
					)
				).toThrow(
					'Add Note requires a valid Bible location'
				);
			}
		);
	}
);

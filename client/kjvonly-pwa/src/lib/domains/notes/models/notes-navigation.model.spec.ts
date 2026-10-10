import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NOTES_BIBLE_SCOPE_KINDS,
	parseNotesBibleScope,
	parseNotesNavigationIntent
} from './notes-navigation.model';

describe(
	'Notes navigation intent',
	() => {
		it(
			'parses an explicit exact Bible scope independently from the create location',
			() => {
				expect(
					parseNotesNavigationIntent({
						noteID: 'note-1',
						bibleScope: {
							kind: 'exact',
							bibleLocationRef:
								'43_3_16_7'
						},
						createBibleLocationRef:
							'43_3_16_9'
					})
				).toEqual({
					noteID: 'note-1',
					bibleScope: {
						kind:
							NOTES_BIBLE_SCOPE_KINDS.EXACT,
						bibleLocationRef:
							'43_3_16_7'
					},
					createBibleLocationRef:
						'43_3_16_9'
				});
			}
		);

		it(
			'parses a chapter Bible scope',
			() => {
				expect(
					parseNotesNavigationIntent({
						bibleScope: {
							kind: 'chapter',
							bibleLocationRef:
								'43_3'
						}
					})
				).toEqual({
					bibleScope: {
						kind:
							NOTES_BIBLE_SCOPE_KINDS.CHAPTER,
						bibleLocationRef:
							'43_3'
					}
				});
			}
		);

		it(
			'rejects the removed root-level Bible location field',
			() => {
				expect(
					() =>
						parseNotesNavigationIntent({
							bibleLocationRef:
								'43_3_16_7'
						})
				).toThrow(
					'Invalid Notes Bible location state; use bibleScope'
				);
			}
		);

		it(
			'keeps scope and create location independently optional',
			() => {
				expect(
					parseNotesNavigationIntent({})
				).toEqual({});

				expect(
					parseNotesNavigationIntent({
						createBibleLocationRef:
							'43_3_16_7'
					})
				).toEqual({
					createBibleLocationRef:
						'43_3_16_7'
				});
			}
		);

		it(
			'rejects invalid Notes-owned navigation values',
			() => {
				expect(
					() =>
						parseNotesNavigationIntent({
							noteID: 1
						})
				).toThrow(
					'Invalid Notes note ID state'
				);

				expect(
					() =>
						parseNotesNavigationIntent({
							createBibleLocationRef: false
						})
				).toThrow(
					'Invalid Notes create Bible location state'
				);
			}
		);
	}
);

describe(
	'parseNotesBibleScope',
	() => {
		it(
			'rejects an invalid scope kind',
			() => {
				expect(
					() =>
						parseNotesBibleScope({
							kind: 'verse',
							bibleLocationRef:
								'43_3_16_0'
						})
				).toThrow(
					'Invalid Notes Bible scope kind'
				);
			}
		);

		it(
			'rejects a non-string scope location',
			() => {
				expect(
					() =>
						parseNotesBibleScope({
							kind: 'chapter',
							bibleLocationRef: 43
						})
				).toThrow(
					'Invalid Notes Bible scope location state'
				);
			}
		);
	}
);

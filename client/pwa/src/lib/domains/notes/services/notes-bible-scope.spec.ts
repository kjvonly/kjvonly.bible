import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BibleLocationReferenceService
} from '$lib/domains/bible';

import type {
	Note,
	NotesById
} from '../models/note.model';
import {
	NOTES_BIBLE_SCOPE_KINDS
} from '../models/notes-navigation.model';
import {
	filterNotesByBibleScope
} from './notes-bible-scope';

const bibleLocationReferenceService =
	new BibleLocationReferenceService();

const notes: NotesById = {
	chapter: createNote(
		'chapter',
		'43_3'
	),
	verse: createNote(
		'verse',
		'43_3_16_0'
	),
	word: createNote(
		'word',
		'43_3_16_7'
	),
	otherWord: createNote(
		'otherWord',
		'43_4_1_1'
	),
	standalone: createNote(
		'standalone',
		undefined
	),
	malformed: createNote(
		'malformed',
		'43'
	)
};

describe(
	'filterNotesByBibleScope',
	() => {
		it(
			'keeps all installed Notes without a Bible scope',
			() => {
				expect(
					Object.keys(
						filterNotesByBibleScope(
							notes,
							undefined,
							bibleLocationReferenceService
						)
					)
				).toEqual(
					Object.keys(notes)
				);
			}
		);

		it(
			'keeps only the exact Bible location for exact scope',
			() => {
				expect(
					Object.keys(
						filterNotesByBibleScope(
							notes,
							{
								kind:
									NOTES_BIBLE_SCOPE_KINDS.EXACT,
								bibleLocationRef:
									'43_3_16_7'
							},
							bibleLocationReferenceService
						)
					)
				).toEqual([
					'word'
				]);
			}
		);

		it(
			'includes chapter-, verse-, and word-level Notes in chapter scope',
			() => {
				expect(
					Object.keys(
						filterNotesByBibleScope(
							notes,
							{
								kind:
									NOTES_BIBLE_SCOPE_KINDS.CHAPTER,
								bibleLocationRef:
									'43_3'
							},
							bibleLocationReferenceService
						)
					)
				).toEqual([
					'chapter',
					'verse',
					'word'
				]);
			}
		);

		it(
			'excludes another chapter, standalone Notes, and malformed locations from chapter scope',
			() => {
				const filtered =
					filterNotesByBibleScope(
						notes,
						{
							kind:
								NOTES_BIBLE_SCOPE_KINDS.CHAPTER,
							bibleLocationRef:
								'43_3'
						},
						bibleLocationReferenceService
					);

				expect(
					filtered.otherWord
				).toBeUndefined();
				expect(
					filtered.standalone
				).toBeUndefined();
				expect(
					filtered.malformed
				).toBeUndefined();
			}
		);
	}
);

function createNote(
	id: string,
	bibleLocationRef: string | undefined
): Note {
	return {
		id,
		bibleLocationRef,
		bibleReferenceText: undefined,
		text: '',
		html: '',
		title: id,
		dateCreated: 1,
		dateUpdated: 1,
		tags: []
	};
}

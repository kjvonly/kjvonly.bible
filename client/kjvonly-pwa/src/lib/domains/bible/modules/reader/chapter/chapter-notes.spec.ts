import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	Note
} from '$lib/domains/notes/models/note.model';

import {
	createChapterNotesByLocation
} from './chapter-notes';

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
		title: '',
		dateCreated: 0,
		dateUpdated: 0,
		tags: []
	};
}

describe(
	'createChapterNotesByLocation',
	() => {
		it(
			'indexes notes by Bible location reference',
			() => {
				const result =
					createChapterNotesByLocation({
						note1: createNote(
							'note1',
							'1_1_1_0'
						),
						note2: createNote(
							'note2',
							'1_1_2_3'
						)
					});

				expect(result).toEqual({
					'1_1_1_0': true,
					'1_1_2_3': true
				});
			}
		);

		it(
			'ignores standalone notes',
			() => {
				const result =
					createChapterNotesByLocation({
						standalone: createNote(
							'standalone',
							undefined
						)
					});

				expect(result).toEqual({});
			}
		);
	}
);

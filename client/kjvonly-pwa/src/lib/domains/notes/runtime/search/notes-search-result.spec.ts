import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	Note
} from '../../models/note.model';

import {
	createNotesSearchResult
} from './notes-search-result';

function createNote(
	id: string
): Note {
	return {
		id,
		bibleLocationRef: undefined,
		bibleReferenceText: undefined,
		title: 'Title',
		text: 'Text',
		html: '<p>Text</p>',
		dateCreated: 1,
		dateUpdated: 2,
		tags: []
	};
}

describe(
	'createNotesSearchResult',
	() => {
		it(
			'returns an empty Notes result when the search has no matches',
			() => {
				expect(
					createNotesSearchResult(
						'search-1',
						[],
						{}
					)
				).toEqual({
					id: 'search-1',
					notes: {}
				});
			}
		);

		it(
			'collects matched Notes and ignores stale search index IDs',
			() => {
				const note =
					createNote(
						'note-1'
					);

				expect(
					createNotesSearchResult(
						'search-1',
						[
							{
								result: [
									'note-1',
									'missing-note'
								]
							}
						],
						{
							'note-1': note
						}
					)
				).toEqual({
					id: 'search-1',
					notes: {
						'note-1': note
					}
				});
			}
		);
	}
);

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createNoteIdForSource,
	parseNotesResourceSource
} from './notes-resource-source';

describe(
	'parseNotesResourceSource',
	() => {
		it(
			'parses the selected Notes name',
			() => {
				expect(
					parseNotesResourceSource({
						publisher:
							'publisher',

						resourceId:
							'kjvonly/notes/entries/default'
					})
				).toEqual({
					name:
						'default'
				});
			}
		);

		it(
			'creates an application Note id from the selected Notes source',
			() => {
				expect(
					createNoteIdForSource(
						{
							publisher:
								'publisher',

							resourceId:
								'kjvonly/notes/entries/default'
						},
						'note-1'
					)
				).toBe(
					'publisher/default/note-1'
				);
			}
		);

		it(
			'rejects an individual Note Resource as a selected source',
			() => {
				expect(
					() =>
						parseNotesResourceSource({
							publisher:
								'publisher',

							resourceId:
								'kjvonly/notes/entries/default/note-1'
						})
				).toThrow(
					'Invalid Notes Resource source: kjvonly/notes/entries/default/note-1'
				);
			}
		);
	}
);

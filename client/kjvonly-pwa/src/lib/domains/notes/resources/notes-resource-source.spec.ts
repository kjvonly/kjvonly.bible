import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createNoteIdForDescriptor,
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
			'creates a Note id from an individual Notes descriptor',
			() => {
				expect(
					createNoteIdForDescriptor({
						metadata: {
							publisher:
								'publisher',

							resourceId:
								'kjvonly/notes/entries/default/note-1',

							category:
								'kjvonly/notes/entries',

							modifiedAt:
								1,

							representation:
								'content',

							mediaType:
								'application/json'
						},

						strategy: {
							type:
								'example',

							data: {}
						}
					})
				).toBe(
					'publisher/default/note-1'
				);
			}
		);

		it(
			'rejects a Notes bundle descriptor when an individual Note is required',
			() => {
				expect(
					() =>
						createNoteIdForDescriptor({
							metadata: {
								publisher:
									'publisher',

								resourceId:
									'kjvonly/notes/entries/default',

								category:
									'kjvonly/notes/entries',

								modifiedAt:
									1,

								representation:
									'content',

								mediaType:
									'application/json'
							},

							strategy: {
								type:
									'example',

								data: {}
							}
						})
				).toThrow(
					'Invalid individual Notes Resource: kjvonly/notes/entries/default'
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

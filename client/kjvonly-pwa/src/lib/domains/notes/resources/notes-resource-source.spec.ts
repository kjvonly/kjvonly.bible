import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NOTE_DATA_TYPE,
	NOTE_DATA_VERSION
} from './notes-resource-contract';

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
							'kjvonly/notes/note/default'
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
								'kjvonly/notes/note/default'
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
								'kjvonly/notes/note/default/note-1',

							resourceType:
								'notes/note',

							dataType:
								NOTE_DATA_TYPE,

							dataVersion:
								NOTE_DATA_VERSION,

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
									'kjvonly/notes/note/default',

								resourceType:
									'notes/note',

								dataType:
									NOTE_DATA_TYPE,

								dataVersion:
									NOTE_DATA_VERSION,

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
					'Invalid individual Notes Resource: kjvonly/notes/note/default'
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
								'kjvonly/notes/note/default/note-1'
						})
				).toThrow(
					'Invalid Notes Resource source: kjvonly/notes/note/default/note-1'
				);
			}
		);
	}
);

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createNoteId,
	parseNoteId
} from './note-id';

describe(
	'Note identity',
	() => {
		it(
			'creates and parses the application Note identity',
			() => {
				const id =
					createNoteId(
						'publisher',
						'default',
						'note-1'
					);

				expect(
					id
				).toBe(
					'publisher/default/note-1'
				);

				expect(
					parseNoteId(
						id
					)
				).toEqual({
					publisher:
						'publisher',

					name:
						'default',

					noteId:
						'note-1'
				});
			}
		);

		it(
			'rejects an invalid application Note identity',
			() => {
				expect(
					() =>
						parseNoteId(
							'publisher/note-1'
						)
				).toThrow(
					'Invalid Note id: publisher/note-1'
				);
			}
		);
	}
);

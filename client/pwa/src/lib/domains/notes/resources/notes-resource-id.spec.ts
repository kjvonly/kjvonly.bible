import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createNotesResourceId,
	parseNotesResourceId
} from './notes-resource-id';

describe(
	'Notes Resource ID',
	() => {
		it(
			'keeps Resource ID separate from Resource Type',
			() => {
				expect(
					createNotesResourceId(
						'default',
						'note-1'
					)
				).toBe(
					'kjvonly/notes/note/default/note-1'
				);
			}
		);

		it(
			'rejects the historical entries identity grammar',
			() => {
				expect(
					() =>
						parseNotesResourceId(
							'kjvonly/notes/entries/default/note-1'
						)
				).toThrow(
					'Invalid Notes Resource ID'
				);
			}
		);
	}
);

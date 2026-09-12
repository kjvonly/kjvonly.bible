import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NOTES_RESOURCE_TYPE
} from './note-interpreter';

import {
	createDefaultNotesSelection,
	DEFAULT_NOTES_RESOURCE_NAME
} from './notes-default-selection';

describe(
	'createDefaultNotesSelection',
	() => {
		it(
			'creates the current user default Notes Resource source',
			() => {
				expect(
					createDefaultNotesSelection(
						'user-pubkey'
					)
				).toEqual({
					publisher:
						'user-pubkey',

					resourceId:
						`${NOTES_RESOURCE_TYPE}/${DEFAULT_NOTES_RESOURCE_NAME}`
				});
			}
		);
	}
);

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createNotesResourceId
} from './notes-resource-id';

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
						createNotesResourceId(
							DEFAULT_NOTES_RESOURCE_NAME
						)
				});
			}
		);
	}
);

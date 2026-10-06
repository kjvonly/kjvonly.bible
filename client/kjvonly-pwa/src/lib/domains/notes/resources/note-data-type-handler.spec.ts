import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NoteDataTypeHandler
} from './note-data-type-handler';

import {
	NOTE_DATA_TYPE,
	NOTE_DATA_VERSION
} from './notes-resource-contract';

describe(
	'NoteDataTypeHandler',
	() => {
		it(
			'exposes the existing Note semantic contract',
			() => {
				const handler =
					new NoteDataTypeHandler();

				expect(
					handler.dataType
				).toBe(
					NOTE_DATA_TYPE
				);

				expect(
					handler.dataVersion
				).toBe(
					NOTE_DATA_VERSION
				);
			}
		);

		it(
			'validates an individual Note payload',
			() => {
				const value =
					createNoteContent();

				expect(
					new NoteDataTypeHandler()
						.validate(
							value
						)
				).toEqual(
					value
				);
			}
		);

		it(
			'validates a bundle of Note payloads',
			() => {
				const value = {
					'note-1':
						createNoteContent(),

					'note-2':
						createNoteContent({
							title:
								'Second'
						})
				};

				expect(
					new NoteDataTypeHandler()
						.validate(
							value
						)
				).toEqual(
					value
				);
			}
		);

		it(
			'rejects Resource ID inside the semantic Note payload',
			() => {
				expect(
					() =>
						new NoteDataTypeHandler()
							.validate({
								...createNoteContent(),
								id:
									'note-1'
							})
				).toThrow();
			}
		);
	}
);

function createNoteContent(
	overrides:
		Record<string, unknown> =
		{}
): Record<string, unknown> {
	return {
		bibleLocationRef:
			'43_3_16',

		bibleReferenceText:
			'John 3:16',

		text:
			'For God so loved',

		html:
			'<p>For God so loved</p>',

		title:
			'John 3:16',

		dateCreated:
			100,

		dateUpdated:
			200,

		tags:
			[],

		...overrides
	};
}

import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	NoteCandidate
} from './note-candidate';

import {
	NoteValidator
} from './note-validator';

describe(
	'NoteValidator',
	() => {
		it(
			'validates a Bible-linked Note',
			() => {
				const validator =
					new NoteValidator();

				expect(
					validator.validate(
						createCandidate({
							value: {
								bibleLocationRef:
									'43_3_16_0',

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

								tags: [
									{
										id:
											'tag-1',

										created:
											100,

										modified:
											100,

										tag:
											'favorite'
									}
								]
							}
						})
					)
				).toEqual({
					name:
						'default',

					noteId:
						'note-1',

					note: {
						bibleLocationRef:
							'43_3_16_0',

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

						tags: [
							{
								id:
									'tag-1',

								created:
									100,

								modified:
									100,

								tag:
									'favorite'
							}
						]
					}
				});
			}
		);

		it(
			'validates a standalone Note without synthetic Bible fields',
			() => {
				const validator =
					new NoteValidator();

				const validated =
					validator.validate(
						createCandidate()
					);

				expect(
					validated.note.bibleLocationRef
				).toBeUndefined();

				expect(
					validated.note.bibleReferenceText
				).toBeUndefined();
			}
		);

		it(
			'rejects legacy Resource-only identity fields in content',
			() => {
				const validator =
					new NoteValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									...createNoteValue(),
									id:
										'note-1'
								}
							})
						)
				).toThrow();
			}
		);

		it(
			'rejects the legacy version field',
			() => {
				const validator =
					new NoteValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									...createNoteValue(),
									version:
										1
								}
							})
						)
				).toThrow();
			}
		);
	}
);

function createCandidate(
	overrides:
		Partial<NoteCandidate> =
		{}
): NoteCandidate {
	return {
		name:
			'default',

		noteId:
			'note-1',

		value:
			createNoteValue(),

		...overrides
	};
}

function createNoteValue(): Record<string, unknown> {
	return {
		text:
			'Text',

		html:
			'<p>Text</p>',

		title:
			'Note',

		dateCreated:
			100,

		dateUpdated:
			200,

		tags: []
	};
}

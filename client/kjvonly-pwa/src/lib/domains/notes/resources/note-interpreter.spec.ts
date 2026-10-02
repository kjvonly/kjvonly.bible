import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource';

import {
	NoteInterpreter
} from './note-interpreter';

import {
	NOTE_DATA_TYPE_V1,
	NOTES_RESOURCE_TYPE
} from './notes-resource-contract';

describe(
	'NoteInterpreter',
	() => {
		it(
			'interprets a v1 Notes bundle into Note candidates',
			() => {
				const interpreter =
					new NoteInterpreter();

				const value = {
					'note-1':
						createNoteValue({
							title:
								'First'
						}),

					'note-2':
						createNoteValue({
							title:
								'Second'
						})
				};

				const candidates = [
					...interpreter.interpret(
						createResource({
							value
						})
					)
				];

				expect(
					candidates
				).toEqual([
					{
						name:
							'default',

						noteId:
							'note-1',

						value:
							value['note-1']
					},
					{
						name:
							'default',

						noteId:
							'note-2',

						value:
							value['note-2']
					}
				]);
			}
		);

		it(
			'interprets an individual Note Resource',
			() => {
				const interpreter =
					new NoteInterpreter();

				const value =
					createNoteValue();

				const candidates = [
					...interpreter.interpret(
						createResource({
							resourceId:
								'kjvonly/notes/entries/default/note-1',

							value
						})
					)
				];

				expect(
					candidates
				).toEqual([
					{
						name:
							'default',

						noteId:
							'note-1',

						value
					}
				]);
			}
		);

		it(
			'rejects a Notes Resource without a data type',
			() => {
				const interpreter =
					new NoteInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								dataType:
									undefined
							})
						)
					]
				).toThrow(
					'Notes data type is required.'
				);
			}
		);

		it(
			'accepts the explicit v1 Notes data type',
			() => {
				const interpreter =
					new NoteInterpreter();

				const candidates = [
					...interpreter.interpret(
						createResource({
							dataType:
								NOTE_DATA_TYPE_V1,

							resourceId:
								'kjvonly/notes/entries/default/note-1',

							value:
								createNoteValue()
						})
					)
				];

				expect(
					candidates
				).toHaveLength(
					1
				);
			}
		);

		it(
			'rejects an unsupported explicit Notes data type',
			() => {
				const interpreter =
					new NoteInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								dataType:
									'kjvonly.note/v2'
							})
						)
					]
				).toThrow(
					'Unsupported Notes data type: kjvonly.note/v2'
				);
			}
		);

		it(
			'preserves the Notes name from the Resource path',
			() => {
				const interpreter =
					new NoteInterpreter();

				const candidates = [
					...interpreter.interpret(
						createResource({
							resourceId:
								'kjvonly/notes/entries/study/note-1'
						})
					)
				];

				expect(
					candidates[0].name
				).toBe(
					'study'
				);
			}
		);

		it(
			'rejects the Notes Resource root',
			() => {
				const interpreter =
					new NoteInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								resourceId:
									NOTES_RESOURCE_TYPE
							})
						)
					]
				).toThrow(
					'Notes Resource root is not supported.'
				);
			}
		);

		it(
			'rejects a bundle whose content is not an object',
			() => {
				const interpreter =
					new NoteInterpreter();

				expect(
					() => [
						...interpreter.interpret(
							createResource({
								value:
									'not-notes'
							})
						)
					]
				).toThrow(
					'Notes bundle content must be an object.'
				);
			}
		);
	}
);

function createNoteValue(
	overrides:
		Record<string, unknown> =
		{}
): Record<string, unknown> {
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

		tags: [],

		...overrides
	};
}

function createResource(
	overrides:
		Partial<DecodedResourceContent> =
		{}
): DecodedResourceContent {
	return {
		publisher:
			'publisher',

		resourceType:
			NOTES_RESOURCE_TYPE,

		resourceId:
			'kjvonly/notes/entries/default',

		modifiedAt:
			100,

		mediaType:
			'application/json',

		dataType:
			NOTE_DATA_TYPE_V1,

		value: {},

		...overrides
	};
}

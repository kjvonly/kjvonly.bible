import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import {
	NOTES_RESOURCE_TYPE,
	NoteInterpreter
} from './note-interpreter';

describe(
	'NoteInterpreter',
	() => {
		it(
			'interprets a Notes bundle into Note candidates',
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

		value: {},

		...overrides
	};
}

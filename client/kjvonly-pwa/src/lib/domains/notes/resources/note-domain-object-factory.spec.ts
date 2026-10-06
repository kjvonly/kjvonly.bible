import {
	describe,
	expect,
	it
} from 'vitest';

import {
	NOTE_OBJECT_TYPE
} from '../models/note-id';

import {
	NoteDomainObjectFactory
} from './note-domain-object-factory';

import {
	NOTE_DATA_TYPE,
	NOTES_RESOURCE_TYPE
} from './notes-resource-contract';

import {
	createNotesResourceId
} from './notes-resource-id';

describe(
	'NoteDomainObjectFactory',
	() => {
		it(
			'creates one canonical Note Domain object from an individual Resource',
			() => {
				const content =
					createNoteContent();

				expect(
					new NoteDomainObjectFactory()
						.create(
							createContext(
								createNotesResourceId(
									'default',
									'note-1'
								)
							),
							content
						)
				).toEqual([
					{
						objectType:
							NOTE_OBJECT_TYPE,


						objectId:
							'publisher/default/note-1',

						dataType:
							NOTE_DATA_TYPE,

						dataVersion:
							1,

						value: {
							id:
								'publisher/default/note-1',

							...content
						}
					}
				]);
			}
		);

		it(
			'creates many canonical Note Domain objects from a named bundle',
			() => {
				const first =
					createNoteContent();

				const second =
					createNoteContent({
						title:
							'Second'
					});

				const candidates =
					new NoteDomainObjectFactory()
						.create(
							createContext(
								createNotesResourceId(
									'study'
								)
							),
							{
								'note-1':
									first,

								'note-2':
									second
							}
						);

				expect(
					candidates.map(
						(candidate) =>
							candidate.objectId
					)
				).toEqual([
					'publisher/study/note-1',
					'publisher/study/note-2'
				]);
			}
		);

		it(
			'rejects the historical entries Resource ID grammar',
			() => {
				expect(
					() =>
						new NoteDomainObjectFactory()
							.create(
								createContext(
									'kjvonly/notes/entries/default/note-1'
								),
								createNoteContent()
							)
				).toThrow(
					'Invalid Notes Resource ID'
				);
			}
		);

		it(
			'rejects a bundle payload at an individual Resource path',
			() => {
				expect(
					() =>
						new NoteDomainObjectFactory()
							.create(
								createContext(
									createNotesResourceId(
									'default',
									'note-1'
								)
								),
								{
									'note-1':
										createNoteContent()
								}
							)
				).toThrow(
					'Individual Notes Resource must contain one Note.'
				);
			}
		);
	}
);

function createContext(
	resourceId: string
) {
	return {
		publisher:
			'publisher',

		resourceId,

		resourceType:
			NOTES_RESOURCE_TYPE,

		dataType:
			'kjvonly.note',

		dataVersion:
			1,

		modifiedAt:
			100,

		mediaType:
			'application/json'
	};
}

function createNoteContent(
	overrides:
		Record<string, unknown> =
		{}
): Record<string, unknown> {
	return {
		bibleLocationRef:
			undefined,

		bibleReferenceText:
			undefined,

		text:
			'Note',

		html:
			'<p>Note</p>',

		title:
			'Note',

		dateCreated:
			100,

		dateUpdated:
			200,

		tags:
			[],

		...overrides
	};
}

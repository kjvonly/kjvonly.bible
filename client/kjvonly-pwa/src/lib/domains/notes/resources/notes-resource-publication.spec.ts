import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	Note
} from '../models/note.model';

import {
	NotesResourcePublication
} from './notes-resource-publication';

describe(
	'NotesResourcePublication',
	() => {
		it(
			'derives the Resource publication identity from the Note Domain identity',
			() => {
				const publication =
					new NotesResourcePublication()
						.create(
							createNote()
						);

				expect(
					publication
				).toEqual({
					type:
						'resource',

					publisher:
						'publisher',

					resourceType:
						'notes/note',

					dataType:
						'kjvonly.note',

					dataVersion:
						1,

					resourceId:
						'kjvonly/notes/note/default/note-1',

					representation:
						'content',

					mediaType:
						'application/json+gzip+hex',

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

						tags: []
					}
				});

				expect(
					publication.value
				).not.toHaveProperty(
					'id'
				);
			}
		);

		it(
			'preserves undefined Bible fields for a standalone Note before serialization',
			() => {
				const publication =
					new NotesResourcePublication()
						.create({
							...createNote(),
							bibleLocationRef:
								undefined,
							bibleReferenceText:
								undefined
						});

				expect(
					publication.value
				).toMatchObject({
					bibleLocationRef:
						undefined,

					bibleReferenceText:
						undefined
				});
			}
		);

		it(
			'derives the publisher and name from the Domain identity',
			() => {
				const publication =
					new NotesResourcePublication()
						.create({
							...createNote(),
							id:
								'other-publisher/study/note-1'
						});

				expect(
					publication.publisher
				).toBe(
					'other-publisher'
				);

				expect(
					publication.resourceId
				).toBe(
					'kjvonly/notes/note/study/note-1'
				);
			}
		);

		it(
			'creates an explicit Resource deletion from the Note Domain identity',
			() => {
				const deletion =
					new NotesResourcePublication()
						.createDeletion(
							'publisher/default/note-1'
						);

				expect(
					deletion
				).toEqual({
					type:
						'resource',

					operation:
						'delete',

					publisher:
						'publisher',

					resourceType:
						'notes/note',

					resourceId:
						'kjvonly/notes/note/default/note-1'
				});
			}
		);

		it(
			'rejects an invalid Note application identity',
			() => {
				expect(
					() =>
						new NotesResourcePublication()
							.create({
								...createNote(),
								id:
									'note-1'
							})
				).toThrow(
					'Invalid Note id: note-1'
				);
			}
		);

	it('publishes an exact normalized word association in the current payload', () => {
		const association = {
			kind: 'normalized-document' as const,
			document: { publisher: 'doc-owner', resourceId: 'a/opaque%id' },
			target: { kind: 'word' as const,
				address: { blockId: '__proto__', contentIndex: 2 } }
		};
		const publication = new NotesResourcePublication().create({
			...createNote(), bibleLocationRef: undefined,
			bibleReferenceText: undefined, association
		});
		expect(publication.dataVersion).toBe(1);
		expect(publication.value).toHaveProperty('association', association);
		expect(publication.value).not.toHaveProperty('id');
	});

	}
);

function createNote(): Note {
	return {
		id:
			'publisher/default/note-1',

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

		tags: []
	};
}

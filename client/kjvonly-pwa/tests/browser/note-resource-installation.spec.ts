import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createResourceInstallationId,
	createResourceReceiptId
} from '$lib/resource';

import {
	createNoteId
} from '$lib/domains/notes/models/note-id';

import {
	NOTE_OBJECT_TYPE
} from '$lib/domains/notes/persistence/notes-store';

import {
	IndexedDBNotesStore
} from '$lib/domains/notes/persistence/indexeddb-notes-store';

import {
	IndexedDBNotesInstallationTransaction
} from '$lib/domains/notes/persistence/notes-installation-transaction';

import {
	NoteInstaller
} from '$lib/domains/notes/resources/note-installer';

import {
	NOTES_RESOURCE_TYPE,
	NoteInterpreter
} from '$lib/domains/notes/resources/note-interpreter';

import {
	NoteResourceHandler
} from '$lib/domains/notes/resources/note-resource-handler';

import {
	NoteValidator
} from '$lib/domains/notes/resources/note-validator';

import {
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	createBrowserTestPublisher,
	createResourceInstallationTestService
} from './support/resource-installation-test-service';

describe(
	'Note Resource installation',
	() => {
		it(
			'decodes validates and installs a Note into IndexedDB',
			async () => {
				const publisher =
					createBrowserTestPublisher();

				const name =
					'default';

				const resourceNoteId =
					'browser-note';

				const resourceId =
					`${NOTES_RESOURCE_TYPE}/${name}/${resourceNoteId}`;

				const value = {
					bibleLocationRef:
						'kjv/1_1_1',

					bibleReferenceText:
						'Genesis 1:1',

					text:
						'In the beginning',

					html:
						'<p>In the beginning</p>',

					title:
						'Browser Note',

					dateCreated:
						100,

					dateUpdated:
						150,

					tags:
						[]
				};

				const service =
					createResourceInstallationTestService(
						new NoteResourceHandler(
							new NoteInterpreter(),
							new NoteValidator(),
							new NoteInstaller(
								new IndexedDBNotesInstallationTransaction(
									getApplicationDB
								)
							)
						),
						{
							publisher,
							resourceId,
							resourceType:
								NOTES_RESOURCE_TYPE,
							value,
							modifiedAt:
								200
						}
					);

				const result =
					await service.install({
						publisher,
						resourceId
					});

				expect(
					result
				).toEqual({
					requested: {
						publisher,
						resourceId
					},

					found:
						true,

					resources: [
						{
							reference: {
								publisher,
								resourceId
							},

							resourceType:
								NOTES_RESOURCE_TYPE,

							status:
								'handled'
						}
					]
				});

				const noteId =
					createNoteId(
						publisher,
						name,
						resourceNoteId
					);

				const notesStore =
					new IndexedDBNotesStore(
						getApplicationDB
					);

				expect(
					await notesStore.get(
						noteId
					)
				).toEqual({
					id:
						noteId,

					...value
				});

				const installationId =
					createResourceInstallationId(
						NOTE_OBJECT_TYPE,
						noteId
					);

				const db =
					await getApplicationDB();

				expect(
					await db.get(
						RESOURCE_INSTALLATIONS,
						installationId
					)
				).toEqual({
					id:
						installationId,

					objectType:
						NOTE_OBJECT_TYPE,

					objectId:
						noteId,

					publisher,
					resourceId,
					modifiedAt:
						200
				});

				expect(
					await db.get(
						RESOURCE_RECEIPTS,
						createResourceReceiptId(
							publisher,
							resourceId
						)
					)
				).toEqual({
					id:
						createResourceReceiptId(
							publisher,
							resourceId
						),

					publisher,
					resourceId,
					modifiedAt:
						200
				});
			}
		);
	}
);

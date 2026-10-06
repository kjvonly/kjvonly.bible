import {
	describe,
	expect,
	it
} from 'vitest';

import {
	GenericResourceInstaller,
	ResourceDataTypeResolver,
	ResourceDomainObjectFactoryResolver,
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
	NOTE_DATA_TYPE,
	NOTE_DATA_VERSION,
	NOTES_RESOURCE_TYPE,
	createNotesResourceId,
	NoteDataTypeHandler,
	NoteDomainObjectFactory
} from '$lib/domains/notes';

import {
	DOMAIN_OBJECTS,
	RESOURCE_INSTALLATIONS,
	RESOURCE_RECEIPTS,
	createStoredDomainObjectId,
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	IndexedDBGenericResourceInstallationTransaction
} from '$lib/resource/installation/indexeddb-generic-resource-installation-transaction';

import {
	createBrowserTestPublisher,
	createGenericResourceInstallationTestService
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
					createNotesResourceId(
						name,
						resourceNoteId
					);

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

				const genericInstaller =
					new GenericResourceInstaller(
						new ResourceDataTypeResolver([
							new NoteDataTypeHandler()
						]),
						new ResourceDomainObjectFactoryResolver([
							new NoteDomainObjectFactory()
						]),
						new IndexedDBGenericResourceInstallationTransaction(
							getApplicationDB
						)
					);

				const service =
					createGenericResourceInstallationTestService(
						genericInstaller,
						{
							publisher,
							resourceId,
							resourceType:
								NOTES_RESOURCE_TYPE,
							dataType:
								NOTE_DATA_TYPE,
							dataVersion:
								NOTE_DATA_VERSION,
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

				const db =
					await getApplicationDB();

				expect(
					await notesStore.get(
						noteId
					)
				).toEqual({
					id:
						noteId,

					...value
				});

				expect(
					await db.get(
						DOMAIN_OBJECTS,
						createStoredDomainObjectId(
							NOTE_OBJECT_TYPE,
							noteId
						)
					)
				).toEqual({
					id:
						createStoredDomainObjectId(
							NOTE_OBJECT_TYPE,
							noteId
						),

					objectType:
						NOTE_OBJECT_TYPE,

					objectId:
						noteId,

					dataType:
						NOTE_DATA_TYPE,

					dataVersion:
						1,

					value: {
						id:
							noteId,

						...value
					}
				});

				const installationId =
					createResourceInstallationId(
						NOTE_OBJECT_TYPE,
						noteId
					);

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

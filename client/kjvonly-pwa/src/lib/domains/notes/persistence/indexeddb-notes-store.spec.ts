import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	Note
} from '$lib/domains/notes/models/note.model';

import {
	DOMAIN_OBJECTS,
	OBJECT_TYPE_INDEX,
	createStoredDomainObjectId,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	NOTE_OBJECT_TYPE
} from './notes-store';

import {
	IndexedDBNotesStore
} from './indexeddb-notes-store';

describe(
	'IndexedDBNotesStore',
	() => {
		it(
			'gets a Note from the shared Domain Object store',
			async () => {
				const note =
					createNote();

				const get =
					vi.fn()
						.mockResolvedValue({
							id:
								createStoredDomainObjectId(
									NOTE_OBJECT_TYPE,
									note.id
								),
							objectType:
								NOTE_OBJECT_TYPE,
							objectId:
								note.id,
							value:
								note
						});

				const store =
					createStore({
						get
					});

				await expect(
					store.get(
						note.id
					)
				).resolves.toEqual(
					note
				);

				expect(
					get
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					createStoredDomainObjectId(
						NOTE_OBJECT_TYPE,
						note.id
					)
				);
			}
		);

		it(
			'lists Notes with one objectType index query',
			async () => {
				const notes = [
					createNote(),
					createNote({
						id:
							'publisher/default/note-2',
						title:
							'Another Note'
					})
				];

				const getAllFromIndex =
					vi.fn()
						.mockResolvedValue(
							notes.map(
								(note) => ({
									id:
										createStoredDomainObjectId(
											NOTE_OBJECT_TYPE,
											note.id
										),
									objectType:
										NOTE_OBJECT_TYPE,
									objectId:
										note.id,
									value:
										note
								})
							)
						);

				const store =
					createStore({
						getAllFromIndex
					});

				await expect(
					store.getAll()
				).resolves.toEqual(
					notes
				);

				expect(
					getAllFromIndex
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					getAllFromIndex
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					OBJECT_TYPE_INDEX,
					NOTE_OBJECT_TYPE
				);
			}
		);

		it(
			'puts a Note in the shared Domain Object envelope',
			async () => {
				const put =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const store =
					createStore({
						put
					});

				const note =
					createNote();

				await store.put(
					note
				);

				expect(
					put
				).toHaveBeenCalledWith(
					DOMAIN_OBJECTS,
					{
						id:
							createStoredDomainObjectId(
								NOTE_OBJECT_TYPE,
								note.id
							),
						objectType:
							NOTE_OBJECT_TYPE,
						objectId:
							note.id,
						value:
							note
					}
				);
			}
		);
	}
);

function createStore(
	db: Partial<ApplicationDB>
): IndexedDBNotesStore {
	return new IndexedDBNotesStore(
		async () =>
			db as ApplicationDB
	);
}

function createNote(
	overrides:
		Partial<Note> =
		{}
): Note {
	return {
		id:
			'publisher/default/note-1',
		bibleLocationRef:
			'kjvs/1_1_1',
		bibleReferenceText:
			'Genesis 1:1',
		text:
			'Note text',
		html:
			'<p>Note text</p>',
		title:
			'Note title',
		dateCreated:
			100,
		dateUpdated:
			200,
		tags:
			[],
		...overrides
	};
}

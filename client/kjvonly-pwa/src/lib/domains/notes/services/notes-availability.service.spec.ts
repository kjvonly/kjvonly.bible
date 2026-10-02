import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	Note
} from '../models/note.model';

import type {
	ResourceDescriptor
} from '$lib/resource';

import type {
	FilesystemSearchByIndex,
	FilesystemSearchMatch
} from '$lib/domains/filesystem';

import {
	NOTE_DATA_TYPE_V1,
	NOTES_RESOURCE_TYPE
} from '../resources/notes-resource-contract';

import {
	NotesAvailabilityService
} from './notes-availability.service';

class FakeNotesStore {
	get =
		vi.fn<(id: string) => Promise<Note | undefined>>();
}

class FakeFilesystemSearch {
	search =
		vi.fn<
			(
				byIndex:
					FilesystemSearchByIndex,
				text: string
			) => Promise<readonly FilesystemSearchMatch[]>
		>()
			.mockResolvedValue([]);
}

describe(
	'NotesAvailabilityService',
	() => {
		it(
			'finds uninstalled Note descriptors advertised by the filesystem',
			async () => {
				const store =
					new FakeNotesStore();

				const filesystem =
					new FakeFilesystemSearch();

				const descriptor = {
					...createNoteDescriptor(),
					metadata: {
						...createNoteDescriptor().metadata,
						name: 'Grace Note',
						dataType:
							NOTE_DATA_TYPE_V1
					}
				};

				store.get
					.mockResolvedValue(
						undefined
					);

				filesystem.search
					.mockResolvedValue([
						{
							publisher:
								'catalog-publisher',
							rootPath:
								'notes',
							entry: {
								path:
									'studies/grace-note',
								descriptor
							}
						}
					]);

				const service =
					new NotesAvailabilityService(
						store,
						filesystem
					);

				await expect(
					service.search(
						'grace'
					)
				).resolves.toEqual([
					{
						id:
							'publisher/default/note-1',
						name:
							'Grace Note',
						filesystemPublisher:
							'catalog-publisher',
						rootPath:
							'notes',
						path:
							'studies/grace-note',
						descriptor
					}
				]);

				expect(
					filesystem.search
				).toHaveBeenCalledWith(
					{
						index: 'category',
						value:
							NOTES_RESOURCE_TYPE
					},
					'grace'
				);
			}
		);

		it(
			'finds Note descriptors across data type versions by stable Resource category',
			async () => {
				const store =
					new FakeNotesStore();

				const filesystem =
					new FakeFilesystemSearch();

				const v1Descriptor = {
					...createNoteDescriptor(),
					metadata: {
						...createNoteDescriptor().metadata,
						resourceId:
							'kjvonly/notes/entries/default/note-v1',
						dataType:
							NOTE_DATA_TYPE_V1
					}
				};

				const v2Descriptor = {
					...createNoteDescriptor(),
					metadata: {
						...createNoteDescriptor().metadata,
						resourceId:
							'kjvonly/notes/entries/default/note-v2',
						dataType:
							'kjvonly.note/v2'
					}
				};

				store.get
					.mockResolvedValue(
						undefined
					);

				filesystem.search
					.mockResolvedValue([
						{
							publisher: 'catalog',
							rootPath: 'notes',
							entry: {
								path: 'note-v1',
								descriptor:
									v1Descriptor
							}
						},
						{
							publisher: 'catalog',
							rootPath: 'notes',
							entry: {
								path: 'note-v2',
								descriptor:
									v2Descriptor
							}
						}
					]);

				const service =
					new NotesAvailabilityService(
						store,
						filesystem
					);

				await expect(
					service.search(
						''
					)
				).resolves.toHaveLength(
					2
				);

				expect(
					filesystem.search
				).toHaveBeenCalledWith(
					{
						index: 'category',
						value:
							NOTES_RESOURCE_TYPE
					},
					''
				);
			}
		);

		it(
			'uses the newest descriptor revision when multiple catalogs advertise the same Note',
			async () => {
				const store =
					new FakeNotesStore();

				const filesystem =
					new FakeFilesystemSearch();

				const olderDescriptor = {
					...createNoteDescriptor(),
					metadata: {
						...createNoteDescriptor().metadata,
						name: 'Older Note',
						modifiedAt: 1
					}
				};

				const newerDescriptor = {
					...createNoteDescriptor(),
					metadata: {
						...createNoteDescriptor().metadata,
						name: 'Newer Note',
						modifiedAt: 2
					}
				};

				store.get
					.mockResolvedValue(
						undefined
					);

				filesystem.search
					.mockResolvedValue([
						{
							publisher: 'catalog-a',
							rootPath: 'notes',
							entry: {
								path: 'older-note',
								descriptor:
									olderDescriptor
							}
						},
						{
							publisher: 'catalog-b',
							rootPath: 'favorites',
							entry: {
								path: 'newer-note',
								descriptor:
									newerDescriptor
							}
						}
					]);

				const service =
					new NotesAvailabilityService(
						store,
						filesystem
					);

				await expect(
					service.search(
						''
					)
				).resolves.toEqual([
					{
						id:
							'publisher/default/note-1',
						name:
							'Newer Note',
						filesystemPublisher:
							'catalog-b',
						rootPath:
							'favorites',
						path:
							'newer-note',
						descriptor:
							newerDescriptor
					}
				]);

				expect(
					store.get
				).toHaveBeenCalledTimes(
					1
				);
			}
		);

		it(
			'uses the filesystem basename when an available Note has no display name',
			async () => {
				const store =
					new FakeNotesStore();

				const filesystem =
					new FakeFilesystemSearch();

				const descriptor =
					createNoteDescriptor();

				store.get
					.mockResolvedValue(
						undefined
					);

				filesystem.search
					.mockResolvedValue([
						{
							publisher: 'catalog',
							rootPath: 'notes',
							entry: {
								path:
									'studies/grace-note',
								descriptor
							}
						}
					]);

				const service =
					new NotesAvailabilityService(
						store,
						filesystem
					);

				const available =
					await service.search(
						''
					);

				expect(
					available[0]?.name
				).toBe(
					'grace-note'
				);
			}
		);

		it(
			'omits filesystem Note descriptors that are already installed',
			async () => {
				const store =
					new FakeNotesStore();

				const filesystem =
					new FakeFilesystemSearch();

				const descriptor =
					createNoteDescriptor();

				store.get
					.mockResolvedValue(
						createNote()
					);

				filesystem.search
					.mockResolvedValue([
						{
							publisher: 'catalog-a',
							rootPath: 'notes',
							entry: {
								path: 'note-1',
								descriptor
							}
						},
						{
							publisher: 'catalog-b',
							rootPath: 'favorites',
							entry: {
								path: 'same-note',
								descriptor
							}
						}
					]);

				const service =
					new NotesAvailabilityService(
						store,
						filesystem
					);

				await expect(
					service.search(
						''
					)
				).resolves.toEqual([]);

				expect(
					store.get
				).toHaveBeenCalledTimes(
					1
				);
			}
		);
	}
);

function createNote(
	id: string =
		'publisher/default/note-1'
): Note {
	return {
		id,
		bibleLocationRef:
			undefined,
		bibleReferenceText:
			undefined,
		title: 'Title',
		text: 'Text',
		html: '<p>Text</p>',
		dateCreated: 1,
		dateUpdated: 2,
		tags: []
	};
}

function createNoteDescriptor():
	ResourceDescriptor {
	return {
		metadata: {
			publisher:
				'publisher',

			resourceId:
				'kjvonly/notes/entries/default/note-1',

			category:
				NOTES_RESOURCE_TYPE,

			modifiedAt:
				1,

			representation:
				'content',

			mediaType:
				'application/json'
		},

		strategy: {
			type:
				'example',

			data: {}
		}
	};
}

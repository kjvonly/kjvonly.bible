import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	Note
} from '../models/note.model';

import {
	NotesService
} from './notes.service';

import {
	NotesResourcePublication
} from '../resources/notes-resource-publication';

import type {
	NotesWriteStores,
	NotesWriteTransaction
} from '../resources/notes-write-stores';

import type {
	NotesSearchResult
} from '../runtime/search/notes-search-worker-message';

import type {
	ResourceDescriptor,
	ResourcePublicationIntent
} from '$lib/resource';

import type {
	FilesystemSearchByIndex,
	FilesystemSearchMatch
} from '$lib/domains/filesystem';

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
				'kjvonly/notes/entries',

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

class FakeNotesStore {
	get =
		vi.fn<(id: string) => Promise<Note | undefined>>();

	getAll =
		vi.fn<() => Promise<readonly Note[]>>();
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

class FakeResourceLoader {
	loadDescriptor =
		vi.fn<(descriptor: ResourceDescriptor) => Promise<void>>();
}

class FakeRuntime {
	setResultHandler =
		vi.fn<(handler: (response: NotesSearchResult) => void) => void>();

	initialize =
		vi.fn<(notes: Note[]) => void>();

	search =
		vi.fn<(id: string, text: string, indexes: string[]) => void>();

	getAll =
		vi.fn<(id: string) => void>();

	put =
		vi.fn<(note: Note) => void>();

	remove =
		vi.fn<(noteId: string) => void>();

	refresh =
		vi.fn<() => void>();
}

class FakeWriteTransaction
	implements NotesWriteTransaction {
	readonly notes:
		Note[] =
			[];

	readonly deletedNoteIds:
		string[] =
			[];

	readonly publications:
		Array<{
			objectId: string;
			resource: ResourcePublicationIntent;
		}> =
			[];

	constructor(
		private readonly onComplete:
			() => void =
				() => {},

		private readonly error?:
			Error
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					NotesWriteStores
			) => Promise<TResult>
	): Promise<TResult> {
		if (this.error) {
			throw this.error;
		}

		const result =
			await operation({
				notes: {
					put:
						async (
							note
						) => {
							this.notes.push(
								note
							);
						},

					delete:
						async (
							noteId
						) => {
							this.deletedNoteIds.push(
								noteId
							);
						}
				},

				outbox: {
					put:
						async (
							objectId,
							resource
						) => {
							this.publications.push({
								objectId,
								resource
							});
						}
				}
			});

		this.onComplete();

		return result;
	}
}

describe(
	'NotesService',
	() => {
		it(
			'loads accepted Notes from the Domain store into the search runtime',
			async () => {
				const store =
					new FakeNotesStore();

				const runtime =
					new FakeRuntime();

				const note =
					createNote();

				store.getAll
					.mockResolvedValue([
						note
					]);

				const service =
					createService(
						store,
						runtime
					);

				service.getAllNotes(
					'subscriber'
				);

				await Promise.resolve();
				await Promise.resolve();

				expect(
					store.getAll
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					runtime.initialize
				).toHaveBeenCalledWith([
					note
				]);
			}
		);

		it(
			'returns an existing Note without loading its descriptor',
			async () => {
				const store =
					new FakeNotesStore();

				const runtime =
					new FakeRuntime();

				const resourceLoader =
					new FakeResourceLoader();

				const note =
					createNote();

				const descriptor =
					createNoteDescriptor();

				store.getAll
					.mockResolvedValue([
						note
					]);

				store.get
					.mockResolvedValue(
						note
					);

				const service =
					createService(
						store,
						runtime,
						undefined,
						undefined,
						resourceLoader
					);

				await expect(
					service.getByDescriptor(
						descriptor
					)
				).resolves.toBe(
					note
				);

				expect(
					resourceLoader.loadDescriptor
				).not.toHaveBeenCalled();
			}
		);

		it(
			'loads a missing Note descriptor then re-reads Notes persistence',
			async () => {
				const store =
					new FakeNotesStore();

				const runtime =
					new FakeRuntime();

				const resourceLoader =
					new FakeResourceLoader();

				const note =
					createNote();

				const descriptor =
					createNoteDescriptor();

				store.getAll
					.mockResolvedValue([]);

				store.get
					.mockResolvedValueOnce(
						undefined
					)
					.mockResolvedValueOnce(
						note
					);

				const service =
					createService(
						store,
						runtime,
						undefined,
						undefined,
						resourceLoader
					);

				await expect(
					service.getByDescriptor(
						descriptor
					)
				).resolves.toBe(
					note
				);

				expect(
					resourceLoader.loadDescriptor
				).toHaveBeenCalledWith(
					descriptor
				);

				expect(
					store.get
				).toHaveBeenNthCalledWith(
					1,
					'publisher/default/note-1'
				);

				expect(
					store.get
				).toHaveBeenNthCalledWith(
					2,
					'publisher/default/note-1'
				);

				expect(
					runtime.put
				).toHaveBeenCalledWith(
					note
				);
			}
		);

		it(
			'fails when descriptor processing does not install the expected Note',
			async () => {
				const store =
					new FakeNotesStore();

				const runtime =
					new FakeRuntime();

				const resourceLoader =
					new FakeResourceLoader();

				store.getAll
					.mockResolvedValue([]);

				store.get
					.mockResolvedValue(
						undefined
					);

				const service =
					createService(
						store,
						runtime,
						undefined,
						undefined,
						resourceLoader
					);

				await expect(
					service.getByDescriptor(
						createNoteDescriptor()
					)
				).rejects.toThrow(
					'Note was not installed: publisher/default/note-1'
				);
			}
		);

		it(
			'finds uninstalled Note descriptors advertised by the filesystem',
			async () => {
				const store =
					new FakeNotesStore();

				const runtime =
					new FakeRuntime();

				const filesystem =
					new FakeFilesystemSearch();

				const descriptor = {
					...createNoteDescriptor(),
					metadata: {
						...createNoteDescriptor().metadata,
						name: 'Grace Note',
						dataType: 'kjvonly.note/v1'
					}
				};

				store.getAll
					.mockResolvedValue([]);

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
					createService(
						store,
						runtime,
						undefined,
						undefined,
						undefined,
						filesystem
					);

				await expect(
					service.searchAvailableNotes(
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
							'kjvonly/notes/entries'
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

				const runtime =
					new FakeRuntime();

				const filesystem =
					new FakeFilesystemSearch();

				const v1Descriptor = {
					...createNoteDescriptor(),
					metadata: {
						...createNoteDescriptor().metadata,
						resourceId:
							'kjvonly/notes/entries/default/note-v1',
						dataType:
							'kjvonly.note/v1'
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

				store.getAll
					.mockResolvedValue([]);

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
					createService(
						store,
						runtime,
						undefined,
						undefined,
						undefined,
						filesystem
					);

				await expect(
					service.searchAvailableNotes(
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
							'kjvonly/notes/entries'
					},
					''
				);
			}
		);

		it(
			'uses the filesystem basename when an available Note has no display name',
			async () => {
				const store =
					new FakeNotesStore();

				const runtime =
					new FakeRuntime();

				const filesystem =
					new FakeFilesystemSearch();

				const descriptor =
					createNoteDescriptor();

				store.getAll
					.mockResolvedValue([]);

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
					createService(
						store,
						runtime,
						undefined,
						undefined,
						undefined,
						filesystem
					);

				const available =
					await service
						.searchAvailableNotes(
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

				const runtime =
					new FakeRuntime();

				const filesystem =
					new FakeFilesystemSearch();

				const descriptor =
					createNoteDescriptor();

				store.getAll
					.mockResolvedValue([]);

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
					createService(
						store,
						runtime,
						undefined,
						undefined,
						undefined,
						filesystem
					);

				await expect(
					service.searchAvailableNotes(
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

		it(
			'waits for accepted Notes to load before querying the runtime',
			async () => {
				let resolveNotes:
					((notes: readonly Note[]) => void) |
					undefined;

				const store =
					new FakeNotesStore();

				store.getAll.mockReturnValue(
					new Promise(
						(resolve) => {
							resolveNotes =
								resolve;
						}
					)
				);

				const runtime =
					new FakeRuntime();

				const service =
					createService(
						store,
						runtime
					);

				service.getAllNotes(
					'subscriber'
				);

				expect(
					runtime.getAll
				).not.toHaveBeenCalled();

				resolveNotes?.([]);

				await Promise.resolve();
				await Promise.resolve();

				expect(
					runtime.getAll
				).toHaveBeenCalledWith(
					'subscriber'
				);
			}
		);


		it(
			'refreshes the worker projection after the initial accepted Notes load completes',
			async () => {
				let resolveNotes:
					((notes: readonly Note[]) => void) |
					undefined;

				const store =
					new FakeNotesStore();

				store.getAll.mockReturnValue(
					new Promise(
						(resolve) => {
							resolveNotes =
								resolve;
						}
					)
				);

				const runtime =
					new FakeRuntime();

				const service =
					createService(
						store,
						runtime
					);

				service.refresh();

				expect(
					runtime.refresh
				).not.toHaveBeenCalled();

				resolveNotes?.([]);

				await Promise.resolve();
				await Promise.resolve();

				expect(
					runtime.refresh
				).toHaveBeenCalledTimes(
					1
				);
			}
		);

		it(
			'persists the Note and publication before updating the runtime and waking the Outbox',
			async () => {
				const events:
					string[] =
						[];

				const store =
					new FakeNotesStore();

				store.getAll
					.mockResolvedValue([]);

				const runtime =
					new FakeRuntime();

				runtime.put.mockImplementation(
					() => {
						events.push(
							'runtime'
						);
					}
				);

				const writeTransaction =
					new FakeWriteTransaction(
						() => {
							events.push(
								'commit'
							);
						}
					);

				const wake =
					vi.fn(
						() => {
							events.push(
								'wake'
							);
						}
					);

				const service =
					createService(
						store,
						runtime,
						writeTransaction,
						wake
					);

				const note =
					createNote();

				await service.put(
					note
				);

				expect(
					writeTransaction.notes
				).toEqual([
					note
				]);

				expect(
					writeTransaction.publications
				).toEqual([
					{
						objectId:
							note.id,
						resource: {
							type:
								'resource',

							publisher:
								'publisher',
							resourceType:
								'kjvonly/notes/entries',
							resourceId:
								'kjvonly/notes/entries/default/note-1',
							representation:
								'content',
							mediaType:
								'application/json+gzip+hex',
							value: {
								bibleLocationRef:
									undefined,
								bibleReferenceText:
									undefined,
								text:
									'Text',
								html:
									'<p>Text</p>',
								title:
									'Title',
								dateCreated:
									1,
								dateUpdated:
									2,
								tags:
									[]
							}
						}
					}
				]);

				expect(
					events
				).toEqual([
					'commit',
					'runtime',
					'wake'
				]);
			}
		);

		it(
			'deletes the Note and queues deletion before updating the runtime and waking the Outbox',
			async () => {
				const events:
					string[] =
						[];

				const store =
					new FakeNotesStore();

				store.getAll
					.mockResolvedValue([]);

				const runtime =
					new FakeRuntime();

				runtime.remove.mockImplementation(
					() => {
						events.push(
							'runtime'
						);
					}
				);

				const writeTransaction =
					new FakeWriteTransaction(
						() => {
							events.push(
								'commit'
							);
						}
					);

				const wake =
					vi.fn(
						() => {
							events.push(
								'wake'
							);
						}
					);

				const service =
					createService(
						store,
						runtime,
						writeTransaction,
						wake
					);

				const noteId =
					'publisher/default/note-1';

				await service.delete(
					noteId
				);

				expect(
					writeTransaction.deletedNoteIds
				).toEqual([
					noteId
				]);

				expect(
					writeTransaction.publications
				).toEqual([
					{
						objectId:
							noteId,
						resource: {
							type:
								'resource',

							operation:
								'delete',
							publisher:
								'publisher',
							resourceType:
								'kjvonly/notes/entries',
							resourceId:
								'kjvonly/notes/entries/default/note-1'
						}
					}
				]);

				expect(
					events
				).toEqual([
					'commit',
					'runtime',
					'wake'
				]);
			}
		);

		it(
			'does not update the runtime or wake the Outbox when the local write fails',
			async () => {
				const store =
					new FakeNotesStore();

				store.getAll
					.mockResolvedValue([]);

				const runtime =
					new FakeRuntime();

				const error =
					new Error(
						'write failed'
					);

				const wake =
					vi.fn();

				const service =
					createService(
						store,
						runtime,
						new FakeWriteTransaction(
							() => {},
							error
						),
						wake
					);

				await expect(
					service.put(
						createNote()
					)
				).rejects.toBe(
					error
				);

				expect(
					runtime.put
				).not.toHaveBeenCalled();

				expect(
					wake
				).not.toHaveBeenCalled();
			}
		);

		it(
			'does not remove the Note from the runtime or wake the Outbox when delete persistence fails',
			async () => {
				const store =
					new FakeNotesStore();

				store.getAll
					.mockResolvedValue([]);

				const runtime =
					new FakeRuntime();

				const error =
					new Error(
						'delete failed'
					);

				const wake =
					vi.fn();

				const service =
					createService(
						store,
						runtime,
						new FakeWriteTransaction(
							() => {},
							error
						),
						wake
					);

				await expect(
					service.delete(
						'publisher/default/note-1'
					)
				).rejects.toBe(
					error
				);

				expect(
					runtime.remove
				).not.toHaveBeenCalled();

				expect(
					wake
				).not.toHaveBeenCalled();
			}
		);
	}
);

function createService(
	store:
		FakeNotesStore,

	runtime:
		FakeRuntime,

	writeTransaction:
		FakeWriteTransaction =
			new FakeWriteTransaction(),

	wake:
		ReturnType<typeof vi.fn> =
			vi.fn(),

	resourceLoader:
		FakeResourceLoader =
			new FakeResourceLoader(),

	filesystem:
		FakeFilesystemSearch =
			new FakeFilesystemSearch()
): NotesService {
	return new NotesService(
		store,
		writeTransaction,
		new NotesResourcePublication(),
		{
			wake
		},
		filesystem,
		resourceLoader,
		runtime
	);
}

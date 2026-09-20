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
	NotesService
} from '$lib/domains/notes/services/notes.service';

import {
	NotesResourcePublication
} from '$lib/domains/notes/resources/notes-resource-publication';

import type {
	NotesWriteStores,
	NotesWriteTransaction
} from '$lib/domains/notes/resources/notes-write-stores';

import type {
	NotesSearchResult
} from '$lib/domains/notes/runtime/search/notes-search-worker-message';

import type {
	ResourcePublicationIntent
} from '$lib/resource';

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

class FakeNotesStore {
	getAll =
		vi.fn<() => Promise<readonly Note[]>>();
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
			vi.fn()
): NotesService {
	return new NotesService(
		store,
		writeTransaction,
		new NotesResourcePublication(),
		{
			wake
		},
		runtime
	);
}

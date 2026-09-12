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
	ResourcePublication
} from '$lib/resource/publication/resource-publication';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

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

	putAll =
		vi.fn<(notes: Note[]) => void>();

	remove =
		vi.fn<(noteId: string) => void>();
}

class FakeResourceAcquisition {
	readonly acquire =
		vi.fn<
			(
				source:
					PublishedResourceReference
			) => Promise<readonly Note[]>
		>(
			async () => []
		);
}

class FakeWriteTransaction
	implements NotesWriteTransaction {
	readonly notes:
		Note[] =
			[];

	readonly publications:
		Array<{
			objectId: string;
			resource: ResourcePublication;
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
			'acquires one selected Notes source and batches accepted Notes into the search runtime',
			async () => {
				const store =
					new FakeNotesStore();

				store.getAll
					.mockResolvedValue([]);

				const runtime =
					new FakeRuntime();

				const acquisition =
					new FakeResourceAcquisition();

				const notes = [
					createNote(),
					createNote(
						'publisher/default/note-2'
					)
				];

				acquisition.acquire
					.mockResolvedValue(
						notes
					);

				const service =
					createService(
						store,
						runtime,
						undefined,
						undefined,
						acquisition
					);

				const source = {
					publisher:
						'publisher',
					resourceId:
						'kjvonly/notes/entries/default'
				};

				await service.acquire(
					source
				);

				expect(
					acquisition.acquire
				).toHaveBeenCalledWith(
					source
				);

				expect(
					runtime.putAll
				).toHaveBeenCalledWith(
					notes
				);

				await service.acquire(
					source
				);

				expect(
					acquisition.acquire
				).toHaveBeenCalledTimes(
					1
				);
			}
		);

		it(
			'shares one in-flight acquisition when multiple consumers request the same source',
			async () => {
				const store =
					new FakeNotesStore();

				store.getAll
					.mockResolvedValue([]);

				const runtime =
					new FakeRuntime();

				const acquisition =
					new FakeResourceAcquisition();

				let resolveAcquisition:
					((notes: readonly Note[]) => void) |
					undefined;

				acquisition.acquire
					.mockReturnValue(
						new Promise(
							(resolve) => {
								resolveAcquisition =
									resolve;
							}
						)
					);

				const service =
					createService(
						store,
						runtime,
						undefined,
						undefined,
						acquisition
					);

				const source = {
					publisher:
						'publisher',
					resourceId:
						'kjvonly/notes/entries/default'
				};

				const first =
					service.acquire(
						source
					);

				const second =
					service.acquire(
						source
					);

				await Promise.resolve();
				await Promise.resolve();

				expect(
					acquisition.acquire
				).toHaveBeenCalledTimes(
					1
				);

				resolveAcquisition?.([]);

				await Promise.all([
					first,
					second
				]);
			}
		);

		it(
			'acquires different Notes sources independently',
			async () => {
				const store =
					new FakeNotesStore();

				store.getAll
					.mockResolvedValue([]);

				const runtime =
					new FakeRuntime();

				const acquisition =
					new FakeResourceAcquisition();

				acquisition.acquire
					.mockResolvedValue([]);

				const service =
					createService(
						store,
						runtime,
						undefined,
						undefined,
						acquisition
					);

				await service.acquire({
					publisher:
						'publisher',
					resourceId:
						'kjvonly/notes/entries/default'
				});

				await service.acquire({
					publisher:
						'publisher-2',
					resourceId:
						'kjvonly/notes/entries/subscribed'
				});

				expect(
					acquisition.acquire
				).toHaveBeenCalledTimes(
					2
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

	resourceAcquisition:
		FakeResourceAcquisition =
			new FakeResourceAcquisition()
): NotesService {
	return new NotesService(
		store,
		resourceAcquisition,
		writeTransaction,
		new NotesResourcePublication(),
		{
			wake
		},
		runtime
	);
}

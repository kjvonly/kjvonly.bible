import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	FILESYSTEM_ENTRIES,
	FILESYSTEM_ENTRY_DATA_TYPE_INDEX,
	FILESYSTEM_ENTRY_PUBLISHER_ROOT_PATH_INDEX,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import type {
	FilesystemEntry
} from '../models/filesystem-entry';

import {
	createFilesystemEntryId
} from '../models/filesystem-entry-id';

import {
	IndexedDBFilesystemStore
} from './indexeddb-filesystem-store';

describe(
	'IndexedDBFilesystemStore',
	() => {
		it(
			'gets an entry by source publisher, root, and relative path',
			async () => {
				const entry =
					createEntry();

				const get =
					vi.fn()
						.mockResolvedValue({
							id:
								createFilesystemEntryId(
									'alice',
									'notes',
									entry.path
								),
							publisher:
								'alice',
							rootPath:
								'notes',
							path:
								entry.path,
							value:
								entry
						});

				const store =
					createStore({
						get
					});

				await expect(
					store.get(
						'alice',
						'notes',
						entry.path
					)
				).resolves.toEqual(
					entry
				);

				expect(
					get
				).toHaveBeenCalledWith(
					FILESYSTEM_ENTRIES,
					createFilesystemEntryId(
						'alice',
						'notes',
						entry.path
					)
				);
			}
		);

		it(
			'lists one source publisher and root with one index query',
			async () => {
				const entries = [
					createEntry(),
					createEntry({
						path:
							'the-fall/temptation'
					})
				];

				const getAllFromIndex =
					vi.fn()
						.mockResolvedValue(
							entries.map(
								(entry) => ({
									id:
										createFilesystemEntryId(
											'alice',
											'notes',
											entry.path
										),
									publisher:
										'alice',
									rootPath:
										'notes',
									path:
										entry.path,
									value:
										entry
								})
							)
						);

				const store =
					createStore({
						getAllFromIndex
					});

				await expect(
					store.listByRootPath(
						'alice',
						'notes'
					)
				).resolves.toEqual(
					entries
				);

				expect(
					getAllFromIndex
				).toHaveBeenCalledWith(
					FILESYSTEM_ENTRIES,
					FILESYSTEM_ENTRY_PUBLISHER_ROOT_PATH_INDEX,
					[
						'alice',
						'notes'
					]
				);
			}
		);

		it(
			'lists mounted entries by descriptor dataType with one index query',
			async () => {
				const entries = [
					createEntry(),
					createEntry({
						path:
							'exodus/1'
					})
				];

				const getAllFromIndex =
					vi.fn()
						.mockResolvedValue(
							entries.map(
								(entry) => ({
									id:
										createFilesystemEntryId(
											'alice',
											'bible',
											entry.path
										),
									publisher:
										'alice',
									rootPath:
										'bible',
									path:
										entry.path,
									value:
										entry
								})
							)
						);

				const store =
					createStore({
						getAllFromIndex
					});

				await expect(
					store.listByDataType(
						'kjvonly.bible.chapter/v1'
					)
				).resolves.toEqual(
					entries
				);

				expect(
					getAllFromIndex
				).toHaveBeenCalledWith(
					FILESYSTEM_ENTRIES,
					FILESYSTEM_ENTRY_DATA_TYPE_INDEX,
					'kjvonly.bible.chapter/v1'
				);
			}
		);

		it(
			'persists source identity separately from the target descriptor publisher',
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

				const entry =
					createEntry();

				await store.put(
					'alice',
					'notes',
					entry
				);

				expect(
					entry.descriptor.metadata.publisher
				).toBe(
					'bob'
				);

				expect(
					put
				).toHaveBeenCalledWith(
					FILESYSTEM_ENTRIES,
					{
						id:
							createFilesystemEntryId(
								'alice',
								'notes',
								entry.path
							),
						publisher:
							'alice',
						rootPath:
							'notes',
						path:
							entry.path,
						value:
							entry
					}
				);
			}
		);

		it(
			'deletes an entry by source publisher, root, and relative path',
			async () => {
				const deleteValue =
					vi.fn()
						.mockResolvedValue(
							undefined
						);

				const store =
					createStore({
						delete:
							deleteValue
					});

				await store.delete(
					'alice',
					'notes',
					'the-fall/creation'
				);

				expect(
					deleteValue
				).toHaveBeenCalledWith(
					FILESYSTEM_ENTRIES,
					createFilesystemEntryId(
						'alice',
						'notes',
						'the-fall/creation'
					)
				);
			}
		);
	}
);

function createStore(
	db: Partial<ApplicationDB>
): IndexedDBFilesystemStore {
	return new IndexedDBFilesystemStore(
		async () =>
			db as ApplicationDB
	);
}

function createEntry(
	overrides:
		Partial<FilesystemEntry> =
			{}
): FilesystemEntry {
	return {
		path:
			'the-fall/creation',
		descriptor: {
			metadata: {
				publisher:
					'bob',
				resourceId:
					'notes/creation',
				category:
					'notes',
				modifiedAt:
					100,
				representation:
					'content',
				mediaType:
					'application/json',
				dataType:
					'kjvonly.bible.chapter/v1'
			},
			strategy: {
				type:
					'example',
				data: {
					id:
						'content-address'
				}
			}
		},
		...overrides
	};
}

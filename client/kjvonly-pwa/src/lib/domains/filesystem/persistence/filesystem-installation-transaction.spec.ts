import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import {
	FILESYSTEM_ENTRIES,
	RESOURCE_INSTALLATIONS,
	type ApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource';

import {
	createFilesystemEntryId,
	FILESYSTEM_ENTRY_OBJECT_TYPE
} from '../models/filesystem-entry-id';

import type {
	FilesystemEntry
} from '../models/filesystem-entry';

import {
	IndexedDBFilesystemInstallationTransaction
} from './filesystem-installation-transaction';

describe(
	'IndexedDBFilesystemInstallationTransaction',
	() => {
		it(
			'persists a filesystem mapping and ResourceInstallation in one transaction',
			async () => {
				const filesystemPut =
					vi.fn()
						.mockResolvedValue(
							undefined
						);
				const installationGet =
					vi.fn()
						.mockResolvedValue(
							undefined
						);
				const installationPut =
					vi.fn()
						.mockResolvedValue(
							undefined
						);
				const objectStore =
					vi.fn(
						(name: string) =>
							name === FILESYSTEM_ENTRIES
								? {
									put:
										filesystemPut
								}
								: {
									get:
										installationGet,
									put:
										installationPut
								}
					);
				const transaction = {
					objectStore,
					done:
						Promise.resolve(),
					abort:
						vi.fn()
				};
				const dbTransaction =
					vi.fn()
						.mockReturnValue(
							transaction
						);
				const db = {
					transaction:
						dbTransaction
				} as unknown as ApplicationDB;
				const adapter =
					new IndexedDBFilesystemInstallationTransaction(
						async () => db
					);
				const entry:
					FilesystemEntry = {
						path:
							'the-fall/creation',
						descriptor: {
							metadata: {
								publisher:
									'b'.repeat(64),
								resourceId:
									'note-creation',
								category:
									'kjvonly/notes/entries',
								modifiedAt:
									50,
								representation:
									'content',
								mediaType:
									'application/json'
							},
							strategy: {
								type:
									'nostr',
								data: {}
							}
						}
					};
				const objectId =
					createFilesystemEntryId(
						'alice',
						'notes',
						entry.path
					);
				const installation:
					ResourceInstallation = {
						id:
							createResourceInstallationId(
								FILESYSTEM_ENTRY_OBJECT_TYPE,
								objectId
							),
						objectType:
							FILESYSTEM_ENTRY_OBJECT_TYPE,
						objectId,
						publisher:
							'alice',
						resourceId:
							'my-filesystem',
						modifiedAt:
							100
					};

				await adapter.run(
					async (stores) => {
						await stores.filesystem.put(
							'alice',
							'notes',
							entry
						);
						await stores.resourceInstallations.put(
							installation
						);
					}
				);

				expect(
					dbTransaction
				).toHaveBeenCalledWith(
					[
						FILESYSTEM_ENTRIES,
						RESOURCE_INSTALLATIONS
					],
					'readwrite'
				);

				expect(
					filesystemPut
				).toHaveBeenCalledWith({
					id:
						objectId,
					publisher:
						'alice',
					rootPath:
						'notes',
					path:
						entry.path,
					value:
						entry
				});

				expect(
					installationPut
				).toHaveBeenCalledWith(
					installation
				);
			}
		);
	}
);

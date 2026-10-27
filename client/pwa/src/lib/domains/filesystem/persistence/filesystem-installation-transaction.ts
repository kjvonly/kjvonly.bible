import {
	FILESYSTEM_ENTRIES,
	RESOURCE_INSTALLATIONS,
	type ApplicationDB,
	type StoredFilesystemEntry
} from '$lib/infrastructure/persistence/application.db';

import {
	createResourceInstallationId,
	type ResourceInstallation
} from '$lib/resource';

import {
	createFilesystemEntryId
} from '../models/filesystem-entry-id';

import type {
	FilesystemInstallationStores,
	FilesystemInstallationTransaction
} from '../resources/filesystem-installation-stores';

/**
 * IndexedDB transaction adapter for inbound filesystem mappings and generic
 * ResourceInstallation provenance.
 */
export class IndexedDBFilesystemInstallationTransaction
	implements FilesystemInstallationTransaction {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	/** Runs one atomic filesystem installation operation. */
	async run<TResult>(
		operation:
			(
				stores:
					FilesystemInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		const db =
			await this.getDB();

		const transaction =
			db.transaction(
				[
					FILESYSTEM_ENTRIES,
					RESOURCE_INSTALLATIONS
				],
				'readwrite'
			);

		const filesystemEntries =
			transaction.objectStore(
				FILESYSTEM_ENTRIES
			);

		const resourceInstallations =
			transaction.objectStore(
				RESOURCE_INSTALLATIONS
			);

		const stores:
			FilesystemInstallationStores = {
				filesystem: {
					put:
						async (
							publisher,
							rootPath,
							entry
						) => {
							const stored:
								StoredFilesystemEntry = {
									id:
										createFilesystemEntryId(
											publisher,
											rootPath,
											entry.path
										),
									publisher,
									rootPath,
									path:
										entry.path,
									value:
										entry
								};

							await filesystemEntries.put(
								stored
							);
						}
				},

				resourceInstallations: {
					get:
						async (
							objectType,
							objectId
						) => {
							return await resourceInstallations.get(
								createResourceInstallationId(
									objectType,
									objectId
								)
							) as
								| ResourceInstallation
								| undefined;
						},

					put:
						async (
							installation
						) => {
							await resourceInstallations.put(
								installation
							);
						}
				}
			};

		try {
			const result =
				await operation(
					stores
				);

			await transaction.done;

			return result;
		} catch (error) {
			try {
				transaction.abort();
			} catch {
				// Transaction may already be inactive.
			}

			try {
				await transaction.done;
			} catch {
				// Preserve the original operation error.
			}

			throw error;
		}
	}
}

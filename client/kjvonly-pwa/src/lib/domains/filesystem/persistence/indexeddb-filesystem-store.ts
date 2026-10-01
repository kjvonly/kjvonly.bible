import {
	FILESYSTEM_ENTRIES,
	FILESYSTEM_ENTRY_DATA_TYPE_INDEX,
	FILESYSTEM_ENTRY_PUBLISHER_ROOT_PATH_INDEX,
	type ApplicationDB,
	type StoredFilesystemEntry
} from '$lib/infrastructure/persistence/application.db';

import type {
	FilesystemEntry
} from '../models/filesystem-entry';

import {
	createFilesystemEntryId
} from '../models/filesystem-entry-id';

import type {
	FilesystemStore
} from './filesystem-store';

/**
 * IndexedDB persistence adapter for discoverable filesystem mappings.
 *
 * Filesystem entries deliberately live outside DOMAIN_OBJECTS because they
 * describe Resources that are available to the application rather than Domain
 * data that has already been materialized.
 */
export class IndexedDBFilesystemStore
	implements FilesystemStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	/** Returns one entry by its source filesystem identity. */
	async get(
		publisher: string,
		rootPath: string,
		path: string
	): Promise<
		FilesystemEntry |
		undefined
	> {
		const db =
			await this.getDB();

		const stored =
			await db.get(
				FILESYSTEM_ENTRIES,
				createFilesystemEntryId(
					publisher,
					rootPath,
					path
				)
			);

		return stored?.value as
			| FilesystemEntry
			| undefined;
	}

	/** Lists entries under one source publisher and filesystem root. */
	async listByRootPath(
		publisher: string,
		rootPath: string
	): Promise<
		readonly FilesystemEntry[]
	> {
		const db =
			await this.getDB();

		const stored =
			await db.getAllFromIndex(
				FILESYSTEM_ENTRIES,
				FILESYSTEM_ENTRY_PUBLISHER_ROOT_PATH_INDEX,
				[
					publisher,
					rootPath
				]
			);

		return stored.map(
			(row) =>
				row.value as FilesystemEntry
		);
	}

	/** Lists mounted entries by semantic data type. */
	async listByDataType(
		dataType: string
	): Promise<
		readonly FilesystemEntry[]
	> {
		const db =
			await this.getDB();

		const stored =
			await db.getAllFromIndex(
				FILESYSTEM_ENTRIES,
				FILESYSTEM_ENTRY_DATA_TYPE_INDEX,
				dataType
			);

		return stored.map(
			(row) =>
				row.value as FilesystemEntry
		);
	}

	/** Stores one entry under its source publisher and filesystem root. */
	async put(
		publisher: string,
		rootPath: string,
		entry: FilesystemEntry
	): Promise<void> {
		const db =
			await this.getDB();

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

		await db.put(
			FILESYSTEM_ENTRIES,
			stored
		);
	}

	/** Removes one entry by its source filesystem identity. */
	async delete(
		publisher: string,
		rootPath: string,
		path: string
	): Promise<void> {
		const db =
			await this.getDB();

		await db.delete(
			FILESYSTEM_ENTRIES,
			createFilesystemEntryId(
				publisher,
				rootPath,
				path
			)
		);
	}
}

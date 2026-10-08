import {
	FILESYSTEM_ENTRIES,
	FILESYSTEM_ENTRY_PUBLISHER_ROOT_PATH_INDEX,
	type ApplicationDB,
	type StoredFilesystemEntry
} from '$lib/infrastructure/persistence/application.db';

import type {
	FilesystemEntry
} from '../models/filesystem-entry';

import type {
	FilesystemRoot
} from '../models/filesystem-root';

import {
	createFilesystemEntryId
} from '../models/filesystem-entry-id';

import type {
	FilesystemStore
} from './filesystem-store';

/**
 * IndexedDB persistence adapter for accepted Filesystem mappings.
 *
 * Filesystem entries deliberately live outside DOMAIN_OBJECTS because the
 * accepted value is the Filesystem mapping itself, not the target Resource's
 * Domain Object. A stored descriptor may identify a target Resource that has
 * not yet been resolved or installed.
 */
export class IndexedDBFilesystemStore
	implements FilesystemStore {

	constructor(
		private readonly getDB:
			() => Promise<ApplicationDB>
	) {}

	/** Returns each distinct source publisher/root pair currently mounted. */
	async listRoots(): Promise<
		readonly FilesystemRoot[]
	> {
		const db =
			await this.getDB();

		const transaction =
			db.transaction(
				FILESYSTEM_ENTRIES,
				'readonly'
			);

		const index =
			transaction.store.index(
				FILESYSTEM_ENTRY_PUBLISHER_ROOT_PATH_INDEX
			);

		const roots:
			FilesystemRoot[] = [];

		let previousPublisher:
			string | undefined;

		let previousRootPath:
			string | undefined;

		let cursor =
			await index.openKeyCursor();

		while (cursor !== null) {
			const [
				publisher,
				rootPath
			] = cursor.key;

			if (
				publisher !==
					previousPublisher ||
				rootPath !==
					previousRootPath
			) {
				roots.push({
					publisher,
					rootPath
				});

				previousPublisher =
					publisher;
				previousRootPath =
					rootPath;
			}

			cursor =
				await cursor.continue();
		}

		await transaction.done;

		return roots;
	}

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

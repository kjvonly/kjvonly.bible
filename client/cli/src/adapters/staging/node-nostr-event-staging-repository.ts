import {
	readdir
} from 'node:fs/promises';

import {
	basename,
	dirname,
	join
} from 'node:path';

import {
	isStagingLogicalName,
	STAGED_COLLECTIONS_DIRECTORY,
	STAGED_FILESYSTEMS_DIRECTORY
} from '#domain/staging/staging-layout.js';

import { CollectionEventStagingRepository, StagedCollectionEventEntry } from '#ports/staging/collection-event-staging-repository.js';
import { FilesystemEventStagingRepository, StagedFilesystemEventEntry } from '#ports/staging/filesystem-event-staging-repository.js';
import { NostrEventStagingRepository, StagedNostrEventCategory, StagedNostrEventEntry } from '#ports/staging/nostr-event-staging-repository.js';
import { SignedEventStagingRepository, StagedEventEntry } from '#ports/staging/signed-event-staging-repository.js';


/**
 * Reads staged Nostr Resource events from the Node staging layout.
 * Publication category selection and ordering are owned by the application layer.
 */
export class NodeNostrEventStagingRepository
	implements NostrEventStagingRepository {

	constructor(
		private readonly signedEventStagingRepository:
			SignedEventStagingRepository,

		private readonly collectionEventStagingRepository:
			CollectionEventStagingRepository,

		private readonly filesystemEventStagingRepository:
			FilesystemEventStagingRepository
	) {}


	async list(
		stagingRoot:
			string,

		category:
			StagedNostrEventCategory,

		logicalNames?: readonly string[]
	): Promise<
		readonly StagedNostrEventEntry[]
	> {

		switch (
			category
		) {
			case 'resource':
				return this.listResourceEntries(
					stagingRoot, logicalNames
				);

			case 'collection':
				return this.listCollectionEntries(
					stagingRoot, logicalNames
				);

			case 'filesystem':
				return this.listFilesystemEntries(
					stagingRoot, logicalNames
				);

			default:
				throw new Error(
					`Unsupported staged Nostr event category: ${String(category)}`
				);
		}
	}


	async read(
		entry:
			StagedNostrEventEntry
	) {

		const resourceName =
			basename(
				dirname(
					entry.path
				)
			);


		const stagingRoot =
			dirname(
				dirname(
					dirname(
						entry.path
					)
				)
			);


		if (
			resourceName ===
				STAGED_COLLECTIONS_DIRECTORY
		) {
			const staged =
				await this
					.collectionEventStagingRepository
					.list(
						stagingRoot
					);


			const sourceEntry =
				staged.find(
					candidate =>
						candidate.path ===
							entry.path
				);


			if (
				sourceEntry ===
					undefined
			) {
				throw new Error(
					`Staged Nostr event not found: ${entry.path}`
				);
			}


			this.assertCollectionEntry(
				entry,
				sourceEntry
			);


			return this
				.collectionEventStagingRepository
				.read(
					sourceEntry
				);
		}


		if (
			resourceName ===
				STAGED_FILESYSTEMS_DIRECTORY
		) {
			const staged =
				await this
					.filesystemEventStagingRepository
					.list(
						stagingRoot
					);


			const sourceEntry =
				staged.find(
					candidate =>
						candidate.path ===
							entry.path
				);


			if (
				sourceEntry ===
					undefined
			) {
				throw new Error(
					`Staged Nostr event not found: ${entry.path}`
				);
			}


			this.assertFilesystemEntry(
				entry,
				sourceEntry
			);


			return this
				.filesystemEventStagingRepository
				.read(
					sourceEntry
				);
		}


		const staged =
			await this
				.signedEventStagingRepository
				.list(
					stagingRoot,
					resourceName
				);


		const sourceEntry =
			staged.find(
				candidate =>
					candidate.path ===
						entry.path
			);


		if (
			sourceEntry ===
				undefined
		) {
			throw new Error(
				`Staged Nostr event not found: ${entry.path}`
			);
		}


		this.assertResourceEntry(
			entry,
			sourceEntry
		);


		return this
			.signedEventStagingRepository
			.read(
				sourceEntry
			);
	}


	private async listResourceEntries(
		stagingRoot:
			string,
		logicalNames?: readonly string[]
	): Promise<
		readonly StagedNostrEventEntry[]
	> {

		// A supplied manifest list is authoritative; do not scan unrelated
		// directories left behind by earlier imports or different manifests.
		const resourceNames = logicalNames === undefined
			? await this.listResourceNames(stagingRoot)
			: [...new Set(logicalNames)].sort();


		const resourceEntries =
			await Promise.all(
				resourceNames.map(
					resourceName =>
						this
							.signedEventStagingRepository
							.list(
								stagingRoot,
								resourceName
							)
				)
			);


		return this.sortByPath(
			resourceEntries
				.flat()
				.map(
					entry =>
						this.fromResourceEntry(
							entry
						)
				)
		);
	}


	private async listCollectionEntries(
		stagingRoot:
			string,
		logicalNames?: readonly string[]
	): Promise<
		readonly StagedNostrEventEntry[]
	> {

		const entries =
			await this
				.collectionEventStagingRepository
				.list(
					stagingRoot
				);


		const names = logicalNames === undefined ? undefined : new Set(logicalNames);
		return this.sortByPath(
			entries
				.filter(entry => names === undefined || names.has(entry.collectionName))
				.map(entry => this.fromCollectionEntry(entry))
		);
	}


	private async listFilesystemEntries(
		stagingRoot:
			string,
		logicalNames?: readonly string[]
	): Promise<
		readonly StagedNostrEventEntry[]
	> {

		const entries =
			await this
				.filesystemEventStagingRepository
				.list(
					stagingRoot
				);


		const names = logicalNames === undefined ? undefined : new Set(logicalNames);
		return this.sortByPath(
			entries
				.filter(entry => names === undefined || names.has(entry.filesystemName))
				.map(entry => this.fromFilesystemEntry(entry))
		);
	}


	private async listResourceNames(
		stagingRoot:
			string
	): Promise<
		readonly string[]
	> {

		const directory =
			join(
				stagingRoot,
				'events'
			);


		let entries;


		try {
			entries =
				await readdir(
					directory,
					{
						withFileTypes:
							true
					}
				);
		}
		catch (
			error:
				unknown
		) {
			if (
				this.isFileNotFound(
					error
				)
			) {
				return [];
			}


			throw error;
		}


		return entries
			.filter(
				entry =>
					entry.isDirectory() &&
					isStagingLogicalName(
						entry.name
					)
			)
			.map(
				entry =>
					entry.name
			)
			.sort();
	}


	private fromResourceEntry(
		entry:
			StagedEventEntry
	): StagedNostrEventEntry {

		return {
			path:
				entry.path,

			eventId:
				entry.metadata.eventId,

			createdAt:
				entry.metadata.createdAt
		};
	}


	private fromCollectionEntry(
		entry:
			StagedCollectionEventEntry
	): StagedNostrEventEntry {

		return {
			path:
				entry.path,

			eventId:
				entry.eventId,

			createdAt:
				entry.createdAt
		};
	}


	private fromFilesystemEntry(
		entry:
			StagedFilesystemEventEntry
	): StagedNostrEventEntry {

		return {
			path:
				entry.path,

			eventId:
				entry.eventId,

			createdAt:
				entry.createdAt
		};
	}


	private assertResourceEntry(
		entry:
			StagedNostrEventEntry,

		sourceEntry:
			StagedEventEntry
	): void {

		if (
			entry.eventId !==
				sourceEntry.metadata.eventId ||
			entry.createdAt !==
				sourceEntry.metadata.createdAt
		) {
			throw new Error(
				`Staged Nostr event metadata does not match filename: ${entry.path}`
			);
		}
	}


	private assertCollectionEntry(
		entry:
			StagedNostrEventEntry,

		sourceEntry:
			StagedCollectionEventEntry
	): void {

		if (
			entry.eventId !==
				sourceEntry.eventId ||
			entry.createdAt !==
				sourceEntry.createdAt
		) {
			throw new Error(
				`Staged Nostr event metadata does not match filename: ${entry.path}`
			);
		}
	}


	private assertFilesystemEntry(
		entry:
			StagedNostrEventEntry,

		sourceEntry:
			StagedFilesystemEventEntry
	): void {

		if (
			entry.eventId !==
				sourceEntry.eventId ||
			entry.createdAt !==
				sourceEntry.createdAt
		) {
			throw new Error(
				`Staged Nostr event metadata does not match filename: ${entry.path}`
			);
		}
	}


	/** Sorts each publication dependency group deterministically by staged path. */
	private sortByPath(
		entries:
			readonly StagedNostrEventEntry[]
	): readonly StagedNostrEventEntry[] {

		return [
			...entries
		].sort(
			(
				left,
				right
			) =>
				left.path.localeCompare(
					right.path
				)
		);
	}


	private isFileNotFound(
		error:
			unknown
	): boolean {

		return (
			error instanceof Error &&
			'code' in error &&
			error.code ===
				'ENOENT'
		);
	}
}
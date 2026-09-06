import {
	readdir
} from 'node:fs/promises';

import {
	basename,
	dirname,
	join
} from 'node:path';
import { CollectionEventStagingRepository, StagedCollectionEventEntry } from '#ports/staging/collection-event-staging-repository.js';
import { NostrEventStagingRepository, StagedNostrEventEntry } from '#ports/staging/nostr-event-staging-repository.js';
import { SignedEventStagingRepository, StagedEventEntry } from '#ports/staging/signed-event-staging-repository.js';

const COLLECTION_DIRECTORY =
	'__collections__';


export class NodeNostrEventStagingRepository
	implements NostrEventStagingRepository {

	constructor(
		private readonly signedEventStagingRepository:
			SignedEventStagingRepository,

		private readonly collectionEventStagingRepository:
			CollectionEventStagingRepository
	) {}


	async list(
		stagingRoot:
			string
	): Promise<
		readonly StagedNostrEventEntry[]
	> {

		const resourceNames =
			await this.listResourceNames(
				stagingRoot
			);


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


		const collectionEntries =
			await this
				.collectionEventStagingRepository
				.list(
					stagingRoot
				);


		return [
			...resourceEntries
				.flat()
				.map(
					entry =>
						this.fromResourceEntry(
							entry
						)
				),

			...collectionEntries
				.map(
					entry =>
						this.fromCollectionEntry(
							entry
						)
				)
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
				COLLECTION_DIRECTORY
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
					!entry.name.startsWith(
						'.'
					) &&
					entry.name !==
						COLLECTION_DIRECTORY
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
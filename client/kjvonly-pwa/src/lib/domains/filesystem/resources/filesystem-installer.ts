import {
	createResourceInstallationId,
	type DecodedResourceContent,
	type ResourceInstallation
} from '$lib/resource';

import {
	createFilesystemEntryId
} from '../models/filesystem-entry-id';

import type {
	FilesystemEntry
} from '../models/filesystem-entry';

import {
	FILESYSTEM_ENTRY_OBJECT_TYPE
} from '../models/filesystem-entry-id';

import type {
	FilesystemInstallationTransaction
} from './filesystem-installation-stores';

import type {
	ValidatedFilesystemEntryCandidate
} from './validated-filesystem-entry-candidate';

/**
 * Installs filesystem mappings and their source Resource provenance atomically.
 *
 * Target Resource descriptors remain unresolved. A later application action may
 * materialize an entry through the generic Resource descriptor lifecycle.
 */
export class FilesystemInstaller {

	constructor(
		private readonly transaction:
			FilesystemInstallationTransaction
	) {}

	/** Installs only mappings supplied by the Resource; omission never deletes. */
	async install(
		resource:
			DecodedResourceContent,

		candidates:
			readonly ValidatedFilesystemEntryCandidate[]
	): Promise<void> {
		if (
			candidates.length ===
				0
		) {
			return;
		}

		const rootPath =
			candidates[0].rootPath;

		for (const candidate of candidates) {
			if (
				candidate.rootPath !==
					rootPath
			) {
				throw new Error(
					'Filesystem Resource contains multiple root paths.'
				);
			}
		}

		await this.transaction.run(
			async (stores) => {
				for (const candidate of candidates) {
					const objectId =
						createFilesystemEntryId(
							resource.publisher,
							rootPath,
							candidate.path
						);

					const currentInstallation =
						await stores
							.resourceInstallations
							.get(
								FILESYSTEM_ENTRY_OBJECT_TYPE,
								objectId
							);

					if (
						currentInstallation !== undefined &&
						resource.modifiedAt <=
							currentInstallation.modifiedAt
					) {
						continue;
					}

					const entry:
						FilesystemEntry = {
							path:
								candidate.path,
							descriptor:
								candidate.descriptor
						};

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
								resource.publisher,
							resourceId:
								resource.resourceId,
							modifiedAt:
								resource.modifiedAt
						};

					await stores.filesystem.put(
						resource.publisher,
						rootPath,
						entry
					);

					await stores
						.resourceInstallations
						.put(
							installation
						);
				}
			}
		);
	}
}

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createResourceInstallationId,
	type DecodedResourceContent,
	type ResourceDescriptor,
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
	FilesystemInstaller
} from './filesystem-installer';

import type {
	FilesystemInstallationStores,
	FilesystemInstallationTransaction
} from './filesystem-installation-stores';

const DESCRIPTOR:
	ResourceDescriptor = {
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
	};

describe(
	'FilesystemInstaller',
	() => {
		it(
			'installs the mapping and source Resource provenance without resolving the target',
			async () => {
				const transaction =
					new FakeTransaction();
				const resource =
					createResource();

				await new FilesystemInstaller(
					transaction
				).install(
					resource,
					[
						{
							rootPath:
								'notes',
							path:
								'the-fall/creation',
							descriptor:
								DESCRIPTOR
						}
					]
				);

				const objectId =
					createFilesystemEntryId(
						resource.publisher,
						'notes',
						'the-fall/creation'
					);

				expect(
					transaction.entries
				).toEqual([
					{
						publisher:
							resource.publisher,
						rootPath:
							'notes',
						entry: {
							path:
								'the-fall/creation',
							descriptor:
								DESCRIPTOR
						}
					}
				]);

				expect(
					transaction.installations
				).toEqual([
					{
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
					}
				]);

				expect(
					transaction.entries[0]
						.entry.descriptor
				).toBe(
					DESCRIPTOR
				);
			}
		);

		it(
			'skips an older or equal source Resource revision',
			async () => {
				const resource =
					createResource();
				const objectId =
					createFilesystemEntryId(
						resource.publisher,
						'notes',
						'the-fall/creation'
					);

				const transaction =
					new FakeTransaction({
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
							'newer-filesystem',
						modifiedAt:
							resource.modifiedAt
					});

				await new FilesystemInstaller(
					transaction
				).install(
					resource,
					[
						{
							rootPath:
								'notes',
							path:
								'the-fall/creation',
							descriptor:
								DESCRIPTOR
						}
					]
				);

				expect(
					transaction.entries
				).toHaveLength(0);
				expect(
					transaction.installations
				).toHaveLength(0);
			}
		);
	}
);

function createResource():
	DecodedResourceContent {
	return {
		publisher:
			'a'.repeat(64),
		resourceId:
			'my-filesystem',
		resourceType:
			'fs',
		modifiedAt:
			100,
		mediaType:
			'application/json',
		metadata: {
			f:
				'notes'
		},
		value: {}
	};
}

class FakeTransaction
	implements FilesystemInstallationTransaction {
	readonly entries: {
		publisher: string;
		rootPath: string;
		entry: FilesystemEntry;
	}[] = [];

	readonly installations:
		ResourceInstallation[] = [];

	constructor(
		private readonly current?:
			ResourceInstallation
	) {}

	async run<TResult>(
		operation:
			(
				stores:
					FilesystemInstallationStores
			) => Promise<TResult>
	): Promise<TResult> {
		return operation({
			filesystem: {
				put:
					async (
						publisher,
						rootPath,
						entry
					) => {
						this.entries.push({
							publisher,
							rootPath,
							entry
						});
					}
			},
			resourceInstallations: {
				get:
					async () =>
						this.current,
				put:
					async (
						installation
					) => {
						this.installations.push(
							installation
						);
					}
			}
		});
	}
}

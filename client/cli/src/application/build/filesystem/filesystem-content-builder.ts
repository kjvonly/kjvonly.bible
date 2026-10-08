import {
	FilesystemDefinition,
	Manifest
} from '#domain/manifest/manifest.js';

import type {
	FilesystemEntriesContent,
	FilesystemEntryContent
} from '#domain/filesystem/filesystem-resource-contract.js';

import {
	ResourceDescriptor
} from '#domain/resource/resource-descriptor.js';

import {
	isFilesystemPathSegment,
	isStrictFilesystemDescendant,
	joinFilesystemPath
} from '#domain/filesystem/filesystem-path.js';

import {
	CollectionEventStagingRepository,
	StagedCollectionEventEntry
} from '#ports/staging/collection-event-staging-repository.js';

import {
	SignedEventStagingRepository,
	StagedEventEntry
} from '#ports/staging/signed-event-staging-repository.js';

import {
	NostrEventResourceDescriptorBuilder
} from '../descriptor/nostr-event-resource-descriptor-builder.js';


/** Signed target revision that contributed one generated Filesystem mapping. */
export interface FilesystemContentReference {
	/** Generated full Filesystem path. */
	readonly path:
		string;

	/** Exact signed target Resource revision used to create the descriptor. */
	readonly eventId:
		string;
}


/** Deterministic Filesystem payload plus the revisions used to derive it. */
export interface FilesystemContentBuildResult {
	/** Deterministically ordered semantic Filesystem payload. */
	readonly content:
		FilesystemEntriesContent;

	/** Deterministically ordered target revisions used by the generated payload. */
	readonly references:
		readonly FilesystemContentReference[];
}


/** Inputs required to expand one manifest Filesystem definition. */
export interface BuildFilesystemContentRequest {
	/** Complete manifest containing the referenced Resource and Collection names. */
	readonly manifest:
		Manifest;

	/** Staging root containing already-built Resource and Collection events. */
	readonly stagingRoot:
		string;

	/** Diagnostic name of the Filesystem definition being assembled. */
	readonly filesystemName:
		string;

	/** Filesystem definition whose placement rules should be expanded. */
	readonly filesystem:
		FilesystemDefinition;
}


interface ResolvedFilesystemEntry {
	readonly path:
		string;

	readonly eventId:
		string;

	readonly descriptor:
		ResourceDescriptor;
}


/**
 * Expands one manifest Filesystem definition into deterministic semantic content.
 *
 * Target Resources and Collections must already exist in local signed staging.
 * The builder never derives Filesystem paths from Resource IDs and never reads
 * target Resource payloads. Manifest placement plus staged Resource `key` values
 * are the only inputs used to construct Filesystem paths.
 */
export class FilesystemContentBuilder {

	constructor(
		private readonly resourceStagingRepository:
			SignedEventStagingRepository,

		private readonly collectionStagingRepository:
			CollectionEventStagingRepository,

		private readonly nostrEventResourceDescriptorBuilder:
			NostrEventResourceDescriptorBuilder
	) {}


	/**
	 * Builds the path-keyed semantic payload for one Filesystem Resource.
	 *
	 * @param request Manifest/staging context for one Filesystem definition.
	 */
	async build(
		request:
			BuildFilesystemContentRequest
	): Promise<FilesystemContentBuildResult> {
		const entries:
			ResolvedFilesystemEntry[] = [];


		const stagedCollections =
			await this
				.collectionStagingRepository
				.list(
					request.stagingRoot
				);


		const stagedCollectionsByName =
			new Map<
				string,
				StagedCollectionEventEntry
			>(
				stagedCollections.map(
					entry => [
						entry.collectionName,
						entry
					]
				)
			);


		for (
			const directory
			of request.filesystem.directories
		) {
			for (
				const [
					placementName,
					placement
				]
				of Object.entries(
					directory.resources
				)
			) {
				entries.push(
					...await this.resolveResourcePlacement({
						request,
						directoryPath:
							directory.path,
						placementName,
						resourceName:
							placement.resource,
						key:
							placement.key
					})
				);
			}


			for (
				const [
					placementName,
					placement
				]
				of Object.entries(
					directory.collections
				)
			) {
				entries.push(
					await this.resolveCollectionPlacement({
						request,
						directoryPath:
							directory.path,
						placementName,
						collectionName:
							placement.collection,
						stagedCollectionsByName
					})
				);
			}
		}


		this.assertNoCollisions(
			request.filesystemName,
			entries
		);


		return this.toDeterministicResult(
			entries
		);
	}


	/** Resolves one selective or bulk Resource placement from signed staging. */
	private async resolveResourcePlacement(
		input: {
			readonly request:
				BuildFilesystemContentRequest;

			readonly directoryPath:
				string;

			readonly placementName:
				string;

			readonly resourceName:
				string;

			readonly key?:
				string;
		}
	): Promise<readonly ResolvedFilesystemEntry[]> {
		const staged =
			await this
				.resourceStagingRepository
				.list(
					input.request.stagingRoot,
					input.resourceName
				);


		if (
			input.key !== undefined
		) {
			const selected =
				staged.find(
					entry =>
						entry.metadata.key ===
							input.key
				);


			if (
				selected === undefined
			) {
				throw new Error(
					`Filesystem "${input.request.filesystemName}" Resource "${input.resourceName}" has no staged key "${input.key}".`
				);
			}


			return [
				await this.createResourceEntry({
					request:
						input.request,
					directoryPath:
						input.directoryPath,
					placementName:
						input.placementName,
					resourceName:
						input.resourceName,
					staged:
						selected
				})
			];
		}


		if (
			staged.length === 0
		) {
			throw new Error(
				`Filesystem "${input.request.filesystemName}" Resource "${input.resourceName}" produced no staged Resources.`
			);
		}


		const entries:
			ResolvedFilesystemEntry[] = [];


		for (
			const stagedEntry
			of staged
		) {
			const key =
				stagedEntry.metadata.key;


			if (
				!isFilesystemPathSegment(
					key
				)
			) {
				throw new Error(
					`Filesystem "${input.request.filesystemName}" Resource "${input.resourceName}" staged key is not a valid Filesystem basename: ${key}`
				);
			}


			entries.push(
				await this.createResourceEntry({
					request:
						input.request,
					directoryPath:
						input.directoryPath,
					placementName:
						input.placementName,
					resourceName:
						input.resourceName,
					staged:
						stagedEntry,
					bulkKey:
						key
				})
			);
		}


		return entries;
	}


	/** Converts one staged Resource event into one Filesystem mapping entry. */
	private async createResourceEntry(
		input: {
			readonly request:
				BuildFilesystemContentRequest;

			readonly directoryPath:
				string;

			readonly placementName:
				string;

			readonly resourceName:
				string;

			readonly staged:
				StagedEventEntry;

			readonly bulkKey?:
				string;
		}
	): Promise<ResolvedFilesystemEntry> {
		const path =
			this.createEntryPath(
				input.request,
				input.directoryPath,
				input.placementName,
				input.bulkKey
			);


		const event =
			await this
				.resourceStagingRepository
				.read(
					input.staged
				);


		const descriptor =
			this
				.nostrEventResourceDescriptorBuilder
				.build({
					resourceName:
						input.resourceName,
					event,
					relays:
						input.request
							.manifest
							.nostr
							.relays
				});


		return {
			path,
			eventId:
				event.id,
			descriptor
		};
	}


	/** Resolves one Collection placement to its staged Collection Resource. */
	private async resolveCollectionPlacement(
		input: {
			readonly request:
				BuildFilesystemContentRequest;

			readonly directoryPath:
				string;

			readonly placementName:
				string;

			readonly collectionName:
				string;

			readonly stagedCollectionsByName:
				ReadonlyMap<
					string,
					StagedCollectionEventEntry
				>;
		}
	): Promise<ResolvedFilesystemEntry> {
		const staged =
			input
				.stagedCollectionsByName
				.get(
					input.collectionName
				);


		if (
			staged === undefined
		) {
			throw new Error(
				`Filesystem "${input.request.filesystemName}" Collection "${input.collectionName}" is not staged.`
			);
		}


		const path =
			this.createEntryPath(
				input.request,
				input.directoryPath,
				input.placementName
			);


		const event =
			await this
				.collectionStagingRepository
				.read(
					staged
				);


		const descriptor =
			this
				.nostrEventResourceDescriptorBuilder
				.build({
					resourceName:
						input.collectionName,
					event,
					relays:
						input.request
							.manifest
							.nostr
							.relays
				});


		return {
			path,
			eventId:
				event.id,
			descriptor
		};
	}


	/** Builds and verifies one complete Filesystem entry path. */
	private createEntryPath(
		request:
			BuildFilesystemContentRequest,

		directoryPath:
			string,

		placementName:
			string,

		bulkKey?:
			string
	): string {
		const path =
			joinFilesystemPath(
				request.filesystem.root,
				directoryPath,
				placementName,
				bulkKey ?? ''
			);


		if (
			!isStrictFilesystemDescendant(
				request.filesystem.root,
				path
			)
		) {
			throw new Error(
				`Filesystem "${request.filesystemName}" generated path outside root "${request.filesystem.root}": ${path}`
			);
		}


		return path;
	}


	/** Rejects exact and file/directory collisions in one generated overlay. */
	private assertNoCollisions(
		filesystemName:
			string,

		entries:
			readonly ResolvedFilesystemEntry[]
	): void {
		const paths =
			new Set<string>();


		for (
			const entry
			of entries
		) {
			if (
				paths.has(
					entry.path
				)
			) {
				throw new Error(
					`Filesystem "${filesystemName}" contains duplicate path: ${entry.path}`
				);
			}


			paths.add(
				entry.path
			);
		}


		for (
			const path
			of paths
		) {
			const segments =
				path.split('/');


			for (
				let index = 1;
				index < segments.length;
				index += 1
			) {
				const ancestor =
					segments
						.slice(
							0,
							index
						)
						.join('/');


				if (
					paths.has(
						ancestor
					)
				) {
					throw new Error(
						`Filesystem "${filesystemName}" contains file/directory collision: ${ancestor} and ${path}`
					);
				}
			}
		}
	}


	/** Projects sorted entries into deterministic content and revision inputs. */
	private toDeterministicResult(
		entries:
			readonly ResolvedFilesystemEntry[]
	): FilesystemContentBuildResult {
		const content:
			Record<
				string,
				FilesystemEntryContent
			> = {};


		const references:
			FilesystemContentReference[] = [];


		const sorted = [
			...entries
		].sort(
			(
				left,
				right
			) =>
				left.path < right.path
					? -1
					: left.path > right.path
						? 1
						: 0
		);


		for (
			const entry
			of sorted
		) {
			content[
				entry.path
			] = {
				descriptor:
					entry.descriptor
			};


			references.push({
				path:
					entry.path,

				eventId:
					entry.eventId
			});
		}


		return {
			content,
			references
		};
	}
}

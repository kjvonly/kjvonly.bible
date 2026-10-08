import {
	Manifest
} from '#domain/manifest/manifest.js';

import {
	calculateFilesystemInputRevision
} from '#domain/filesystem/filesystem-input-revision.js';

import {
	Logger
} from '#ports/logging/logger.js';

import {
	FilesystemEventStagingRepository,
	StagedFilesystemEventEntry
} from '#ports/staging/filesystem-event-staging-repository.js';

import {
	FilesystemContentBuilder
} from './filesystem-content-builder.js';

import {
	FilesystemEventBuilder
} from './filesystem-event-builder.js';


/** Inputs required to reconcile every manifest Filesystem into local staging. */
export interface BuildFilesystemsRequest {
	/** Fully rendered and validated CLI manifest. */
	readonly manifest:
		Manifest;

	/** Root containing already-built Resource and Collection staging. */
	readonly stagingRoot:
		string;

	/** Public key of the signer used for generated Filesystem Resources. */
	readonly publisher:
		string;
}


/**
 * Builds and stages Filesystem Resource events after target Resources/Collections.
 *
 * Unchanged semantic inputs reuse the exact previously signed event so a normal
 * CLI rebuild does not advance Filesystem `modifiedAt` without an actual change.
 */
export class FilesystemBuilder {

	constructor(
		private readonly contentBuilder:
			Pick<FilesystemContentBuilder, 'build'>,

		private readonly eventBuilder:
			Pick<FilesystemEventBuilder, 'build'>,

		private readonly stagingRepository:
			FilesystemEventStagingRepository,

		private readonly logger:
			Logger
	) {}


	/**
	 * Builds every manifest Filesystem and removes obsolete local staging.
	 *
	 * @param request Current manifest, staging root, and signing publisher identity.
	 */
	async build(
		request:
			BuildFilesystemsRequest
	): Promise<void> {
		const staged =
			await this.stagingRepository.list(
				request.stagingRoot
			);


		const stagedByName =
			new Map<
				string,
				StagedFilesystemEventEntry
			>(
				staged.map(
					entry => [
						entry.filesystemName,
						entry
					]
				)
			);


		for (
			const [
				filesystemName,
				filesystem
			]
			of Object.entries(
				request.manifest.filesystems
			)
		) {
			const result =
				await this.contentBuilder.build({
					manifest:
						request.manifest,
					stagingRoot:
						request.stagingRoot,
					filesystemName,
					filesystem
				});


			const inputRevision =
				calculateFilesystemInputRevision({
					kind:
						request.manifest.kind,
					publisher:
						request.publisher,
					root:
						filesystem.root,
					event:
						filesystem.event,
					relays:
						request.manifest.nostr.relays,
					references:
						result.references
				});


			const previous =
				stagedByName.get(
					filesystemName
				);


			if (
				previous !== undefined &&
				previous.inputRevision === inputRevision
			) {
				const previousEvent =
					await this.stagingRepository.read(
						previous
					);


				if (
					previousEvent.pubkey ===
						request.publisher
				) {
					this.logReused(
						filesystemName,
						previous.eventId
					);

					continue;
				}
			}


			const previousEvent =
				previous === undefined
					? undefined
					: await this.stagingRepository.read(
						previous
					);


			const event =
				await this.eventBuilder.build({
					kind:
						request.manifest.kind,
					event:
						filesystem.event,
					root:
						filesystem.root,
					content:
						result.content,
					previousCreatedAt:
						previousEvent?.created_at
				});


			await this.stagingRepository.stage({
				stagingRoot:
					request.stagingRoot,
				filesystemName,
				inputRevision,
				event,
				previous
			});


			this.logStaged(
				filesystemName,
				event.id
			);
		}


		const currentNames =
			new Set(
				Object.keys(
					request.manifest.filesystems
				)
			);


		for (
			const entry
			of staged
		) {
			if (
				!currentNames.has(
					entry.filesystemName
				)
			) {
				await this.stagingRepository.remove(
					entry
				);


				this.logRemoved(
					entry.filesystemName,
					entry.eventId
				);
			}
		}
	}


	private logReused(
		filesystemName:
			string,

		eventId:
			string
	): void {
		this.logger.verbose(
			'filesystem.event.reused',
			{
				filesystemName,
				eventId
			}
		);
	}


	private logStaged(
		filesystemName:
			string,

		eventId:
			string
	): void {
		this.logger.verbose(
			'filesystem.event.staged',
			{
				filesystemName,
				eventId
			}
		);
	}


	private logRemoved(
		filesystemName:
			string,

		eventId:
			string
	): void {
		this.logger.verbose(
			'filesystem.event.removed',
			{
				filesystemName,
				eventId
			}
		);
	}
}

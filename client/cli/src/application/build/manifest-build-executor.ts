import {
	resolve
} from 'node:path';



import type {
	InlineEventBuilder
} from './inline/inline-event-builder.js';

import type {
	SourceExpander
} from './source/source-expander.js';

import type {
	DescriptorBackedResourceBuilder
} from './descriptor/descriptor-backed-resource-builder.js';



import type {
	CollectionBuilder
} from './collection/collection-builder.js';

import type {
	FilesystemBuilder
} from './filesystem/filesystem-builder.js';

import type { Logger } from '#ports/logging/logger.js';
import type { EventSigner } from '#ports/nostr/event-signer.js';
import type { SourceFileMetadata, SourceRepository } from '#ports/source/source-repository.js';
import type { SignedEventStagingRepository, StagedEventEntry } from '#ports/staging/signed-event-staging-repository.js';
import { calculateEventDefinitionRevision } from '#domain/event/event-definition-revision.js';
import type { Manifest } from '#domain/manifest/manifest.js';
import type { SignedNostrEvent } from '#domain/event/nostr-event.js';
import type { ConcreteSource } from '#domain/source/concrete-source.js';
import type { ResourceDescriptor } from '#domain/resource/resource-descriptor.js';

/**
 * A validated Manifest and its source-directory context, independent of how
 * the Manifest was authored (YAML or a future discovery frontend).
 */
export interface ManifestBuildInput {
	/** Base directory used to resolve Manifest source and staging paths. */
	readonly directory: string;
	readonly manifest: Manifest;
	/** Identifier of the Manifest-producing frontend; not a Resource identity. */
	readonly origin: string;
}

export class ManifestBuildExecutor {

	constructor(
		private readonly sourceExpander:
			SourceExpander,

		private readonly sourceRepository:
			SourceRepository,

		private readonly eventBuilder:
			InlineEventBuilder,

		private readonly signer:
			EventSigner,

		private readonly stagingRepository:
			SignedEventStagingRepository,

		private readonly descriptorBackedResourceBuilder:
			DescriptorBackedResourceBuilder,

		private readonly collectionBuilder:
			CollectionBuilder,

		private readonly filesystemBuilder:
			Pick<FilesystemBuilder, 'build'>,

		private readonly logger:
			Logger
	) { }


	/**
	 * Executes a validated Manifest in dependency order: Resources, Collections,
	 * then Filesystems. All frontends share this build path.
	 *
	 * @param input Manifest and directory used to resolve its source/staging paths.
	 */
	async build(input: ManifestBuildInput): Promise<void> {
		const stagingRoot = resolve(input.directory, input.manifest.staging.path);
		const publisher = await this.signer.getPublicKey();
		const descriptorsByResource = await this.buildResources(
			input,
			stagingRoot,
			publisher
		);

		await this.collectionBuilder.build({
			manifest: input.manifest,
			stagingRoot,
			publisher,
			descriptorsByResource
		});

		await this.filesystemBuilder.build({
			manifest: input.manifest,
			stagingRoot,
			publisher
		});
	}

	/**
	 * Expands each Resource definition and builds its signed events. Descriptor-
	 * backed results are retained for Collection references; inline events are
	 * staged directly.
	 *
	 * @param input Provides Resource definitions and the source base directory.
	 * @param stagingRoot Absolute directory holding signed staged events.
	 * @param publisher Public key used to determine event revision/currentness.
	 */
	private async buildResources(
		input: ManifestBuildInput,
		stagingRoot: string,
		publisher: string
	): Promise<Map<string, readonly ResourceDescriptor[]>> {
		const descriptorsByResource = new Map<string, readonly ResourceDescriptor[]>();

		for (const [resourceName, resource] of Object.entries(input.manifest.resources)) {
			this.logResourceStart(resourceName, resource.path);

			const sources = await this.sourceExpander.expand({
				manifestDirectory: input.directory,
				resourceName,
				resource
			});
			this.logResourceExpanded(resourceName, sources);

			if (resource['object-upload'] !== undefined) {
				const descriptors = await this.descriptorBackedResourceBuilder.build({
					manifest: input.manifest,
					stagingRoot,
					resourceName,
					sources
				});
				descriptorsByResource.set(resourceName, descriptors);
				continue;
			}

			await this.buildInlineResource(
				resourceName,
				sources,
				stagingRoot,
				input.manifest.kind,
				publisher
			);
		}

		return descriptorsByResource;
	}

	/**
	 * Reconciles expanded inline sources with staged events for one Resource.
	 * Unchanged sources reuse their signed event; keys no longer present are
	 * removed only after all current sources have been processed successfully.
	 *
	 * @param resourceName Logical Manifest Resource name used by staging.
	 * @param sources Concrete file/key expansions of that Resource.
	 * @param stagingRoot Absolute signed-event staging directory.
	 * @param kind Nostr kind specified by the Manifest.
	 * @param publisher Expected signing public key for reusable events.
	 */
	private async buildInlineResource(
		resourceName: string,
		sources: readonly ConcreteSource[],
		stagingRoot: string,
		kind: number,
		publisher: string
	): Promise<void> {
		const staged = await this.stagingRepository.list(stagingRoot, resourceName);
		const stagedByKey = new Map<string, StagedEventEntry>(
			staged.map(entry => [entry.metadata.key, entry])
		);
		const currentKeys = new Set<string>();

		for (const source of sources) {
			currentKeys.add(source.key);
			await this.reuseOrStageInlineSource(
				resourceName,
				source,
				stagedByKey.get(source.key),
				stagingRoot,
				kind,
				publisher
			);
		}

		await this.removeObsoleteInlineEvents(resourceName, staged, currentKeys);
	}

	/**
	 * Reuses a staged signed event if both source metadata and semantic inputs
	 * match; otherwise rebuilds it using the previous event's timestamp.
	 *
	 * @param previous Staged event for this concrete key, when one exists.
	 * @param kind Manifest Nostr event kind.
	 * @param publisher Public key expected on previously staged events.
	 */
	private async reuseOrStageInlineSource(
		resourceName: string,
		source: ConcreteSource,
		previous: StagedEventEntry | undefined,
		stagingRoot: string,
		kind: number,
		publisher: string
	): Promise<void> {
		const sourceMetadata = await this.sourceRepository.getFileMetadata(source.path);
		const definitionRevision = calculateEventDefinitionRevision({
			kind,
			event: source.event,
			publisher
		});

		let previousEvent: SignedNostrEvent | undefined;
		if (previous !== undefined) {
			previousEvent = await this.stagingRepository.read(previous);
			if (this.isStagedEventReusable(
				previous,
				previousEvent,
				sourceMetadata,
				definitionRevision,
				publisher
			)) {
				this.logResourceReused(resourceName, source.key, previous.metadata.eventId);
				return;
			}
		}

		this.logResourceBuild(
			resourceName,
			source.key,
			previous === undefined ? 'new' : 'changed'
		);

		const event = await this.eventBuilder.build(
			source,
			kind,
			previousEvent?.created_at
		);

		await this.stagingRepository.stage({
			stagingRoot,
			resourceName,
			key: source.key,
			sourceMtimeMs: sourceMetadata.mtimeMs,
			sourceSize: sourceMetadata.size,
			definitionRevision,
			createdAt: event.created_at,
			event,
			previous
		});
		this.logResourceStaged(resourceName, source.key, event.id);
	}

	/**
	 * A staged event can be reused only if the file is unchanged, its event
	 * definition is unchanged, and it was signed by the current publisher.
	 */
	private isStagedEventReusable(
		previous: StagedEventEntry,
		previousEvent: SignedNostrEvent,
		sourceMetadata: SourceFileMetadata,
		definitionRevision: string,
		publisher: string
	): boolean {
		return previous.metadata.sourceMtimeMs === sourceMetadata.mtimeMs &&
			previous.metadata.sourceSize === sourceMetadata.size &&
			previous.metadata.definitionRevision === definitionRevision &&
			previousEvent.pubkey === publisher;
	}

	/**
	 * Prunes staged keys absent from the current expansion of one Resource.
	 * This only cleans local staged events; it does not delete published data.
	 *
	 * @param staged All staged entries found before processing this Resource.
	 * @param currentKeys Keys seen in its current expanded source set.
	 */
	private async removeObsoleteInlineEvents(
		resourceName: string,
		staged: readonly StagedEventEntry[],
		currentKeys: ReadonlySet<string>
	): Promise<void> {
		for (const entry of staged) {
			if (currentKeys.has(entry.metadata.key)) {
				continue;
			}

			this.logResourceRemoved(
				resourceName,
				entry.metadata.key,
				entry.metadata.eventId
			);
			await this.stagingRepository.remove(entry);
		}
	}

	///////////////////////////////////////////////////////////////////////////
	// LOG HELPERS

	private logResourceStart(
		resourceName:
			string,

		path:
			string
	): void {

		this.logger.verbose(
			'build.resource.start',
			{
				resourceName,
				path
			}
		);
	}


	private logResourceExpanded(
		resourceName:
			string,

		sources:
			readonly {
				readonly key:
				string;

				readonly path:
				string;
			}[]
	): void {

		this.logger.verbose(
			'build.resource.expanded',
			{
				resourceName,

				sourceCount:
					sources.length
			}
		);
	}

	private logResourceReused(
		resourceName:
			string,

		key:
			string,

		eventId:
			string
	): void {

		this.logger.verbose(
			'build.resource.reused',
			{
				resourceName,
				key,
				eventId
			}
		);
	}


	private logResourceBuild(
		resourceName:
			string,

		key:
			string,

		reason:
			'new' |
			'changed'
	): void {

		this.logger.verbose(
			'build.resource.build',
			{
				resourceName,
				key,
				reason
			}
		);
	}


	private logResourceStaged(
		resourceName:
			string,

		key:
			string,

		eventId:
			string
	): void {

		this.logger.verbose(
			'build.resource.staged',
			{
				resourceName,
				key,
				eventId
			}
		);
	}

	private logResourceRemoved(
		resourceName:
			string,

		key:
			string,

		eventId:
			string
	): void {

		this.logger.verbose(
			'build.resource.event.removed',
			{
				resourceName,
				key,
				eventId
			}
		);
	}
}
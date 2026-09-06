import {
	resolve
} from 'node:path';

import {
	calculateEventDefinitionRevision
} from '../../domain/event-definition-revision.js';

import type {
	Manifest
} from '../../domain/manifest.js';

import {
	InlineEventBuilder
} from './inline/inline-event-builder.js';

import {
	SourceExpander
} from './source/source-expander.js';

import {
	DescriptorBackedResourceBuilder
} from './descriptor/descriptor-backed-resource-builder.js';

import type {
	ResourceDescriptor
} from '../../domain/resource-descriptor.js';

import {
	CollectionBuilder
} from './collection/collection-builder.js';

import type{  Logger } from '../../ports/logging/logger.js';
import { ManifestLoader } from '../../ports/manifest/manifest-loader.js';
import { EventSigner } from '../../ports/nostr/event-signer.js';
import { SourceRepository } from '../../ports/source/source-repository.js';
import { SignedEventStagingRepository, StagedEventEntry } from '../../ports/staging/signed-event-staging-repository.js';

export interface BuildManifest {
	build(
		manifestPath:
			string
	): Promise<void>;
}


export class BuildManifestUseCase
	implements BuildManifest {

	constructor(
		private readonly manifestLoader:
			ManifestLoader,

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

		private readonly logger:
			Logger
	) { }


	async build(
		manifestPath:
			string
	): Promise<void> {

		this.logBuildStart(
			manifestPath
		);

		const loaded =
			await this.manifestLoader.load(
				manifestPath
			);

		this.logManifestLoaded(
			manifestPath,
			loaded.manifest
		);

		const stagingRoot =
			resolve(
				loaded.directory,
				loaded
					.manifest
					.staging
					.path
			);

		const publisher =
			await this.signer
				.getPublicKey();

		const descriptorsByResource =
			new Map<
				string,
				readonly ResourceDescriptor[]
			>();

		for (
			const [
				resourceName,
				resource
			]
			of Object.entries(
				loaded
					.manifest
					.resources
			)
		) {

			this.logResourceStart(
				resourceName,
				resource.path
			);

			const sources =
				await this.sourceExpander
					.expand({
						manifestDirectory:
							loaded.directory,

						resourceName,

						resource
					});

			this.logResourceExpanded(
				resourceName,
				sources
			);

			if (
				resource[
				'object-upload'
				] !== undefined
			) {
				const descriptors =
					await this
						.descriptorBackedResourceBuilder
						.build({
							manifest:
								loaded.manifest,

							stagingRoot,

							resourceName,

							sources
						});


				descriptorsByResource.set(
					resourceName,
					descriptors
				);


				continue;
			}

			const staged =
				await this
					.stagingRepository
					.list(
						stagingRoot,
						resourceName
					);


			const stagedByKey =
				new Map<
					string,
					StagedEventEntry
				>(
					staged.map(
						entry => [
							entry.metadata.key,
							entry
						]
					)
				);


			const currentKeys =
				new Set<string>();


			for (
				const source
				of sources
			) {
				currentKeys.add(
					source.key
				);


				const sourceMetadata =
					await this
						.sourceRepository
						.getFileMetadata(
							source.path
						);


				const definitionRevision =
					calculateEventDefinitionRevision({
						kind:
							loaded
								.manifest
								.kind,

						event:
							source.event,

						publisher
					});


				const previous =
					stagedByKey.get(
						source.key
					);


				let previousEvent;


				if (
					previous !==
					undefined
				) {
					previousEvent =
						await this
							.stagingRepository
							.read(
								previous
							);


					const unchanged =
						previous
							.metadata
							.sourceMtimeMs ===
						sourceMetadata
							.mtimeMs &&
						previous
							.metadata
							.sourceSize ===
						sourceMetadata
							.size &&
						previous
							.metadata
							.definitionRevision ===
						definitionRevision &&
						previousEvent
							.pubkey ===
						publisher;


					if (
						unchanged
					) {

						this.logResourceReused(
							resourceName,
							source.key,
							previous.metadata.eventId
						);

						continue;
					}
				}

				this.logResourceBuild(
					resourceName,
					source.key,
					previous === undefined
						? 'new'
						: 'changed'
				);
				const event =
					await this.eventBuilder
						.build(
							source,
							loaded
								.manifest
								.kind,
							previousEvent
								?.created_at
						);


				await this
					.stagingRepository
					.stage({
						stagingRoot,

						resourceName,

						key:
							source.key,

						sourceMtimeMs:
							sourceMetadata
								.mtimeMs,

						sourceSize:
							sourceMetadata
								.size,

						definitionRevision,

						createdAt: event.created_at,

						event,

						previous
					});

				this.logResourceStaged(
					resourceName,
					source.key,
					event.id
				);
			}


			for (
				const entry
				of staged
			) {
				if (
					!currentKeys.has(
						entry.metadata.key
					)
				) {

					this.logResourceRemoved(
						resourceName,
						entry.metadata.key,
						entry.metadata.eventId
					);

					await this
						.stagingRepository
						.remove(
							entry
						);
				}
			}
		}

		await this
			.collectionBuilder
			.build({
				manifest:
					loaded.manifest,

				stagingRoot,

				descriptorsByResource
			});


		this.logBuildComplete(
			manifestPath
		);
	}

	///////////////////////////////////////////////////////////////////////////
	// LOG HELPERS

	private logBuildStart(
		manifestPath:
			string
	): void {

		this.logger.verbose(
			'build.start',
			{
				manifestPath
			}
		);
	}


	private logManifestLoaded(
		manifestPath:
			string,

		manifest:
			Manifest
	): void {

		this.logger.verbose(
			'build.manifest.loaded',
			{
				manifestPath,

				resourceCount:
					Object.keys(
						manifest.resources
					).length,

				collectionCount:
					Object.keys(
						manifest.collections
					).length
			}
		);
	}


	private logBuildComplete(
		manifestPath:
			string
	): void {

		this.logger.verbose(
			'build.complete',
			{
				manifestPath
			}
		);
	}

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
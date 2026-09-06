

import {
	DescriptorEventBuilder
} from './descriptor-event-builder.js';

import {
	DescriptorStrategyRegistry
} from './descriptor-strategy-registry.js';

import {
	ObjectArtifactStager
} from '../artifact/object-artifact-stager.js';

import {
	ResourceDescriptorBuilder
} from './resource-descriptor-builder.js';
import { Logger } from '../../../ports/logging/logger.js';
import { EventSigner } from '../../../ports/nostr/event-signer.js';
import { SignedEventStagingRepository, StagedEventEntry } from '../../../ports/staging/signed-event-staging-repository.js';
import { calculateDescriptorEventDefinitionRevision } from '../../../domain/event/descriptor-event-definition-revision.js';
import { Manifest } from '../../../domain/manifest/manifest.js';
import { ResourceDescriptor } from '../../../domain/resource/resource-descriptor.js';
import { ConcreteSource } from '../../../domain/source/concrete-source.js';

export interface BuildDescriptorBackedResourceRequest {
	readonly manifest:
	Manifest;

	readonly stagingRoot:
	string;

	readonly resourceName:
	string;

	readonly sources:
	readonly ConcreteSource[];
}


export class DescriptorBackedResourceBuilder {

	constructor(
		private readonly artifactStager:
			ObjectArtifactStager,

		private readonly strategyRegistry:
			DescriptorStrategyRegistry,

		private readonly eventBuilder:
			DescriptorEventBuilder,

		private readonly descriptorBuilder:
			ResourceDescriptorBuilder,

		private readonly signer:
			EventSigner,

		private readonly eventStagingRepository:
			SignedEventStagingRepository,


		private readonly logger:
			Logger
	) { }


	async build(
		request:
			BuildDescriptorBackedResourceRequest
	): Promise<
		readonly ResourceDescriptor[]
	> {

		this.logBuildStart(
			request
		);
		const artifacts =
			await this.artifactStager
				.stage({
					stagingRoot:
						request.stagingRoot,

					resourceName:
						request.resourceName,

					sources:
						request.sources
				});

		this.logArtifactsStaged(
			request,
			artifacts.length
		);

		const artifactsByKey =
			new Map(
				artifacts.map(
					artifact => [
						artifact
							.metadata
							.key,
						artifact
					]
				)
			);


		const staged =
			await this
				.eventStagingRepository
				.list(
					request.stagingRoot,
					request.resourceName
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


		const publisher =
			await this.signer
				.getPublicKey();


		const currentKeys =
			new Set<string>();


		const descriptors:
			ResourceDescriptor[] =
			[];


		for (
			const source
			of request.sources
		) {
			currentKeys.add(
				source.key
			);


			const objectUpload =
				source.objectUpload;


			if (
				objectUpload ===
				undefined
			) {
				throw new Error(
					`Resource "${request.resourceName}" source "${source.key}" has no object-upload definition.`
				);
			}


			const artifact =
				artifactsByKey.get(
					source.key
				);


			if (
				artifact ===
				undefined
			) {
				throw new Error(
					`Missing staged artifact for Resource "${request.resourceName}" source "${source.key}".`
				);
			}


			const strategyName =
				objectUpload.strategy ??
				request
					.manifest
					.defaults
					?.strategy;


			if (
				strategyName ===
				undefined
			) {
				throw new Error(
					`Resource "${request.resourceName}" source "${source.key}" has no publication strategy.`
				);
			}


			const strategyDefinition =
				request
					.manifest
					.strategies[
				strategyName
				];


			if (
				strategyDefinition ===
				undefined
			) {
				throw new Error(
					`Unknown strategy: ${strategyName}`
				);
			}


			const strategy =
				this.strategyRegistry
					.build(
						strategyDefinition,
						artifact
					);


			const definitionRevision =
				calculateDescriptorEventDefinitionRevision({
					kind:
						request
							.manifest
							.kind,

					event:
						source.event,

					objectUpload,

					publisher,

					strategy:
						strategyDefinition
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
						.eventStagingRepository
						.read(
							previous
						);


				const unchanged =
					previous
						.metadata
						.sourceMtimeMs ===
					artifact
						.metadata
						.sourceMtimeMs &&
					previous
						.metadata
						.sourceSize ===
					artifact
						.metadata
						.sourceSize &&
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

					this.logEventReused(
						request.resourceName,
						source.key,
						previousEvent.id
					);

					descriptors.push(
						this.descriptorBuilder
							.build({
								source,

								artifact,

								publisher,

								modifiedAt:
									previousEvent
										.created_at,

								strategy
							})
					);

					continue;
				}
			}

			this.logEventBuild(
				request.resourceName,
				source.key,
				previous === undefined
					? 'new'
					: 'changed'
			);
			const result =
				await this.eventBuilder
					.build({
						source,

						artifact,

						strategy,

						publisher,

						kind:
							request
								.manifest
								.kind,

						previousCreatedAt:
							previousEvent
								?.created_at
					});


			await this
				.eventStagingRepository
				.stage({
					stagingRoot:
						request.stagingRoot,

					resourceName:
						request.resourceName,

					key:
						source.key,

					sourceMtimeMs:
						artifact
							.metadata
							.sourceMtimeMs,

					sourceSize:
						artifact
							.metadata
							.sourceSize,

					definitionRevision,

					createdAt: result.event.created_at,

					event:
						result.event,

					previous
				});

			this.logEventStaged(
				request.resourceName,
				source.key,
				result.event.id
			);
			descriptors.push(
				result.descriptor
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
				await this
					.eventStagingRepository
					.remove(
						entry
					);
			}
		}

		this.logBuildComplete(
			request.resourceName,
			descriptors.length
		);

		return descriptors;
	}

	///////////////////////////////////////////////////////////////////////////
	// LOG HELPERS

	private logBuildStart(
		request:
			BuildDescriptorBackedResourceRequest
	): void {

		this.logger.verbose(
			'descriptor-resource.build.start',
			{
				resourceName:
					request.resourceName,

				sourceCount:
					request.sources.length
			}
		);
	}


	private logArtifactsStaged(
		request:
			BuildDescriptorBackedResourceRequest,

		artifactCount:
			number
	): void {

		this.logger.verbose(
			'descriptor-resource.artifacts.staged',
			{
				resourceName:
					request.resourceName,

				artifactCount
			}
		);
	}

	private logEventReused(
		resourceName:
			string,

		key:
			string,

		eventId:
			string
	): void {

		this.logger.verbose(
			'descriptor-resource.event.reused',
			{
				resourceName,
				key,
				eventId
			}
		);
	}

	private logEventBuild(
		resourceName:
			string,

		key:
			string,

		reason:
			'new' |
			'changed'
	): void {

		this.logger.verbose(
			'descriptor-resource.event.build',
			{
				resourceName,
				key,
				reason
			}
		);
	}

	private logEventStaged(
		resourceName:
			string,

		key:
			string,

		eventId:
			string
	): void {

		this.logger.verbose(
			'descriptor-resource.event.staged',
			{
				resourceName,
				key,
				eventId
			}
		);
	}

	private logBuildComplete(
		resourceName:
			string,

		descriptorCount:
			number
	): void {

		this.logger.verbose(
			'descriptor-resource.build.complete',
			{
				resourceName,
				descriptorCount
			}
		);
	}
}
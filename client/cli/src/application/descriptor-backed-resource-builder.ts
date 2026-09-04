import {
	calculateDescriptorEventDefinitionRevision
} from '../domain/descriptor-event-definition-revision.js';

import type {
	Manifest
} from '../domain/manifest.js';

import type {
	ConcreteSource
} from '../domain/concrete-source.js';

import type {
	EventSigner
} from '../ports/event-signer.js';

import type {
	SignedEventStagingRepository,
	StagedEventEntry
} from '../ports/signed-event-staging-repository.js';

import {
	DescriptorEventBuilder
} from './descriptor-event-builder.js';

import {
	DescriptorStrategyRegistry
} from './descriptor-strategy-registry.js';

import {
	ObjectArtifactStager
} from './object-artifact-stager.js';


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

		private readonly signer:
			EventSigner,

		private readonly eventStagingRepository:
			SignedEventStagingRepository
	) {}


	async build(
		request:
			BuildDescriptorBackedResourceRequest
	): Promise<void> {

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
					continue;
				}
			}


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

					event:
						result.event,

					previous
				});
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
	}
}
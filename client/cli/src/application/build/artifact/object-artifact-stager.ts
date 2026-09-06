import {
	basename
} from 'node:path';

import type {
	EncodingRegistry
} from '../encoding/encoding-registry.js';



import { Logger } from '#ports/logging/logger.js';
import { SourceRepository } from '#ports/source/source-repository.js';
import { ArtifactStagingRepository, StagedArtifactEntry } from '#ports/staging/artifact-staging-repository.js';
import { calculateArtifactDefinitionRevision } from '#domain/artifact/artifact-definition-revision.js';
import { ConcreteSource } from '#domain/source/concrete-source.js';
import { deriveSourceExtension } from '#domain/source/source-extension.js';

export interface StageObjectArtifactsRequest {
	readonly stagingRoot:
	string;

	readonly resourceName:
	string;

	readonly sources:
	readonly ConcreteSource[];
}


export class ObjectArtifactStager {

	constructor(
		private readonly sourceRepository:
			SourceRepository,

		private readonly encodingRegistry:
			EncodingRegistry,

		private readonly stagingRepository:
			ArtifactStagingRepository,

		private readonly logger:
			Logger
	) { }


	async stage(
		request:
			StageObjectArtifactsRequest
	): Promise<
		readonly StagedArtifactEntry[]
	> {

		const staged =
			await this
				.stagingRepository
				.list(
					request.stagingRoot,
					request.resourceName
				);


		const stagedByKey =
			new Map<
				string,
				StagedArtifactEntry
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


		const current:
			StagedArtifactEntry[] =
			[];


		for (
			const source
			of request.sources
		) {
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


			currentKeys.add(
				source.key
			);


			const sourceMetadata =
				await this
					.sourceRepository
					.getFileMetadata(
						source.path
					);


			const artifactRevision =
				calculateArtifactDefinitionRevision(
					objectUpload
				);


			const previous =
				stagedByKey.get(
					source.key
				);


			if (
				previous !==
				undefined &&
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
					.artifactRevision ===
				artifactRevision
			) {

				this.logArtifactReused(
					request.resourceName,
					source.key,
					previous
				);

				current.push(
					previous
				);

				continue;
			}


			const extension =
				deriveSourceExtension(
					basename(
						source.path
					)
				);


			let artifact:
				StagedArtifactEntry;


			if (
				objectUpload
					.encoding
					.length ===
				0
			) {
				artifact =
					await this
						.stagingRepository
						.stageIdentity({
							stagingRoot:
								request
									.stagingRoot,

							resourceName:
								request
									.resourceName,

							key:
								source.key,

							sourcePath:
								source.path,

							sourceMtimeMs:
								sourceMetadata
									.mtimeMs,

							sourceSize:
								sourceMetadata
									.size,

							artifactRevision,

							extension,

							previous
						});

				this.logArtifactStaged(
					request.resourceName,
					source.key,
					'identity',
					artifact
				);
			}
			else {
				const sourceBytes =
					await this
						.sourceRepository
						.readFile(
							source.path
						);


				const preparedBytes =
					this.encodingRegistry
						.encode(
							sourceBytes,
							objectUpload
								.encoding
						);


				artifact =
					await this
						.stagingRepository
						.stageMaterialized({
							stagingRoot:
								request
									.stagingRoot,

							resourceName:
								request
									.resourceName,

							key:
								source.key,

							bytes:
								preparedBytes,

							sourceMtimeMs:
								sourceMetadata
									.mtimeMs,

							sourceSize:
								sourceMetadata
									.size,

							artifactRevision,

							extension,

							previous
						});


				this.logArtifactStaged(
					request.resourceName,
					source.key,
					'materialized',
					artifact
				);

			}


			current.push(
				artifact
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
					.stagingRepository
					.remove(
						entry
					);
				this.logArtifactRemoved(
					request.resourceName,
					entry.metadata.key
				);

			}

		}

		this.logStageComplete(
			request.resourceName,
			current.length
		);

		return current;
	}

	private logArtifactReused(
		resourceName:
			string,

		key:
			string,

		artifact:
			StagedArtifactEntry
	): void {

		this.logger.verbose(
			'artifact.reused',
			{
				resourceName,
				key,

				sha256:
					artifact
						.metadata
						.sha256
			}
		);
	}

	///////////////////////////////////////////////////////////////////////////
	// Log Helpers

	private logArtifactStaged(
		resourceName:
			string,

		key:
			string,

		mode:
			'identity' |
			'materialized',

		artifact:
			StagedArtifactEntry
	): void {

		this.logger.verbose(
			'artifact.staged',
			{
				resourceName,
				key,
				mode,

				sha256:
					artifact
						.metadata
						.sha256
			}
		);
	}

	private logArtifactRemoved(
		resourceName:
			string,

		key:
			string
	): void {

		this.logger.verbose(
			'artifact.removed',
			{
				resourceName,
				key
			}
		);
	}
	private logStageComplete(
		resourceName:
			string,

		artifactCount:
			number
	): void {

		this.logger.verbose(
			'artifact.stage.complete',
			{
				resourceName,
				artifactCount
			}
		);
	}
}
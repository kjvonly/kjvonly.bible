import {
	basename
} from 'node:path';

import type {
	EncodingRegistry
} from './encoding/encoding-registry.js';

import {
	calculateArtifactDefinitionRevision
} from '../domain/artifact-definition-revision.js';

import type {
	ConcreteSource
} from '../domain/concrete-source.js';

import {
	deriveSourceExtension
} from '../domain/source-extension.js';

import type {
	ArtifactStagingRepository,
	StagedArtifactEntry
} from '../ports/artifact-staging-repository.js';

import type {
	SourceRepository
} from '../ports/source-repository.js';


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
			ArtifactStagingRepository
	) {}


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
			}
		}


		return current;
	}
}
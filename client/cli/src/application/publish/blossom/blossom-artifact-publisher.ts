
import { Manifest } from '../../../domain/manifest/manifest.js';
import { BlossomPublicationResult } from '../../../domain/publication/blossom-publication-result.js';
import { BlossomPublicationClient } from '../../../ports/blossom/blossom-publication-client.js';
import { Logger } from '../../../ports/logging/logger.js';
import { SourceRepository } from '../../../ports/source/source-repository.js';
import { StagedArtifactEntry, ArtifactStagingRepository } from '../../../ports/staging/artifact-staging-repository.js';



interface ArtifactPublicationPlan {
	readonly resourceName:
		string;

	readonly artifact:
		StagedArtifactEntry;

	readonly mediaType:
		string;

	readonly urls:
		readonly string[];
}


export class BlossomArtifactPublisher {

	constructor(
		private readonly artifactStagingRepository:
			ArtifactStagingRepository,

		private readonly sourceRepository:
			SourceRepository,

		private readonly publicationClient:
			BlossomPublicationClient,

		private readonly logger:
			Logger
	) {}


	async publish(
		manifest:
			Manifest,

		stagingRoot:
			string
	): Promise<
		readonly BlossomPublicationResult[]
	> {

		this.logPublishStart(
			stagingRoot
		);


		const plans =
			await this.createPlans(
				manifest,
				stagingRoot
			);


		this.logPlansCreated(
			plans
		);


		await this.validateArtifacts(
			plans
		);


		this.logArtifactsValidated(
			plans.length
		);


		const results:
			BlossomPublicationResult[] =
				[];


		for (
			const plan
			of plans
		) {
			for (
				const url
				of plan.urls
			) {
				const status =
					await this
						.publicationClient
						.ensure({
							serverUrl:
								url,

							artifactPath:
								plan
									.artifact
									.path,

							sha256:
								plan
									.artifact
									.metadata
									.sha256,

							size:
								plan
									.artifact
									.size,

							mediaType:
								plan
									.mediaType
						});


				results.push({
					resourceName:
						plan.resourceName,

					key:
						plan
							.artifact
							.metadata
							.key,

					sha256:
						plan
							.artifact
							.metadata
							.sha256,

					url,

					status
				});
			}
		}


		this.logPublishComplete(
			results.length
		);


		return results;
	}


	private async createPlans(
		manifest:
			Manifest,

		stagingRoot:
			string
	): Promise<
		readonly ArtifactPublicationPlan[]
	> {

		const plans:
			ArtifactPublicationPlan[] =
				[];


		for (
			const [
				resourceName,
				resource
			]
			of Object.entries(
				manifest.resources
			)
		) {
			const objectUpload =
				resource[
					'object-upload'
				];


			if (
				objectUpload ===
					undefined
			) {
				continue;
			}


			const strategyName =
				objectUpload.strategy ??
				manifest
					.defaults
					?.strategy;


			if (
				strategyName ===
					undefined
			) {
				throw new Error(
					`Resource "${resourceName}" has no publication strategy.`
				);
			}


			const strategy =
				manifest
					.strategies[
						strategyName
					];


			if (
				strategy ===
					undefined
			) {
				throw new Error(
					`Unknown publication strategy: ${strategyName}`
				);
			}


			if (
				strategy.type !==
					'blossom'
			) {
				throw new Error(
					`Unsupported artifact publication strategy: ${strategy.type}`
				);
			}


			const artifacts =
				await this
					.artifactStagingRepository
					.list(
						stagingRoot,
						resourceName
					);


			for (
				const artifact
				of artifacts
			) {
				plans.push({
					resourceName,

					artifact,

					mediaType:
						objectUpload
							.mediaType,

					urls:
						strategy.urls
				});
			}
		}


		return plans;
	}


	private async validateArtifacts(
		plans:
			readonly ArtifactPublicationPlan[]
	): Promise<void> {

		for (
			const plan
			of plans
		) {
			const artifact =
				plan.artifact;


			let metadata;


			try {
				metadata =
					await this
						.sourceRepository
						.getFileMetadata(
							artifact.path
						);
			}
			catch (
				error:
					unknown
			) {
				throw new Error(
					`Staged artifact is unavailable for Resource "${plan.resourceName}" key "${artifact.metadata.key}".`,
					{
						cause:
							error
					}
				);
			}


			if (
				artifact.kind ===
					'symlink'
			) {
				if (
					metadata.mtimeMs !==
						artifact
							.metadata
							.sourceMtimeMs ||
					metadata.size !==
						artifact
							.metadata
							.sourceSize
				) {
					throw new Error(
						`Staged artifact is stale for Resource "${plan.resourceName}" key "${artifact.metadata.key}".`
					);
				}


				continue;
			}


			if (
				metadata.size !==
					artifact.size
			) {
				throw new Error(
					`Staged artifact size mismatch for Resource "${plan.resourceName}" key "${artifact.metadata.key}".`
				);
			}
		}
	}


	private logPublishStart(
		stagingRoot:
			string
	): void {

		this.logger.verbose(
			'blossom.publish.start',
			{
				stagingRoot
			}
		);
	}


	private logPlansCreated(
		plans:
			readonly ArtifactPublicationPlan[]
	): void {

		this.logger.verbose(
			'blossom.plans.created',
			{
				planCount:
					plans.length,

				targetCount:
					plans.reduce(
						(
							total,
							plan
						) =>
							total +
							plan.urls.length,
						0
					)
			}
		);
	}


	private logArtifactsValidated(
		artifactCount:
			number
	): void {

		this.logger.verbose(
			'blossom.artifacts.validated',
			{
				artifactCount
			}
		);
	}


	private logPublishComplete(
		resultCount:
			number
	): void {

		this.logger.verbose(
			'blossom.publish.complete',
			{
				resultCount
			}
		);
	}

}

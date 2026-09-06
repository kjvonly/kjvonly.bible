import {
	resolve
} from 'node:path';


import { BlossomArtifactPublisher } from './blossom/blossom-artifact-publisher.js';
import { NostrStagedEventPublisher } from './nostr/nostr-staged-event-publisher.js';
import { PublicationPreflight } from './preflight/publication-preflight.js';
import { Logger } from '../../ports/logging/logger.js';
import { ManifestLoader } from '../../ports/manifest/manifest-loader.js';
import { PublicationResult } from '../../domain/publication/publication-result.js';



export interface PublishManifest {
	publish(
		manifestPath:
			string
	): Promise<
		readonly PublicationResult[]
	>;
}


export class PublishManifestUseCase
	implements PublishManifest {

	constructor(
		private readonly manifestLoader:
			ManifestLoader,

		private readonly publicationPreflight:
			PublicationPreflight,

		private readonly blossomArtifactPublisher:
			BlossomArtifactPublisher,

		private readonly nostrStagedEventPublisher:
			NostrStagedEventPublisher,

		private readonly logger:
			Logger
	) { }


	async publish(
		manifestPath:
			string
	): Promise<PublicationResult[]> {

		this.logPublishStart(
			manifestPath
		);


		const loaded =
			await this.manifestLoader
				.load(
					manifestPath
				);


		this.logManifestLoaded(
			manifestPath,
			loaded.manifest.resources,
			loaded.manifest.collections
		);


		await this
			.publicationPreflight
			.check(
				loaded.manifest
			);


		this.logPreflightComplete(
			manifestPath
		);


		const stagingRoot =
			resolve(
				loaded.directory,
				loaded
					.manifest
					.staging
					.path
			);


		const blossomResults =
			await this
				.blossomArtifactPublisher
				.publish(
					loaded.manifest,
					stagingRoot
				);


		this.logBlossomComplete(
			blossomResults.length
		);


		const nostrResults =
			await this
				.nostrStagedEventPublisher
				.publish(
					loaded.manifest,
					stagingRoot
				);


		this.logNostrComplete(
			nostrResults.length
		);


		const results = [
			...blossomResults.map(
				data => ({
					type:
						'blossom',

					data
				})
			),

			...nostrResults.map(
				data => ({
					type:
						'nostr',

					data
				})
			)
		];


		this.logPublishComplete(
			results.length
		);


		return results;
	}


	private logPublishStart(
		manifestPath:
			string
	): void {

		this.logger.verbose(
			'publish.start',
			{
				manifestPath
			}
		);
	}


	private logManifestLoaded(
		manifestPath:
			string,

		resources:
			Readonly<
				Record<
					string,
					unknown
				>
			>,

		collections:
			Readonly<
				Record<
					string,
					unknown
				>
			>
	): void {

		this.logger.verbose(
			'publish.manifest.loaded',
			{
				manifestPath,

				resourceCount:
					Object.keys(
						resources
					).length,

				collectionCount:
					Object.keys(
						collections
					).length
			}
		);
	}


	private logPreflightComplete(
		manifestPath:
			string
	): void {

		this.logger.verbose(
			'publish.preflight.complete',
			{
				manifestPath
			}
		);
	}


	private logBlossomComplete(
		resultCount:
			number
	): void {

		this.logger.verbose(
			'publish.blossom.complete',
			{
				resultCount
			}
		);
	}


	private logNostrComplete(
		resultCount:
			number
	): void {

		this.logger.verbose(
			'publish.nostr.complete',
			{
				resultCount
			}
		);
	}


	private logPublishComplete(
		resultCount:
			number
	): void {

		this.logger.verbose(
			'publish.complete',
			{
				resultCount
			}
		);
	}
}

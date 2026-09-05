import type {
	ManifestLoader
} from '../ports/manifest-loader.js';

import {
	PublicationPreflight
} from './publication-preflight.js';

import {
	resolve
} from 'node:path';

import {
	BlossomArtifactPublisher
} from './blossom-artifact-publisher.js';

import type {
	PublicationResult
} from '../domain/publication-result.js';

import {
	NostrStagedEventPublisher
} from './nostr-staged-event-publisher.js';

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
			NostrStagedEventPublisher
	) { }

	async publish(
		manifestPath:
			string
	): Promise<PublicationResult[]> {

		const loaded =
			await this.manifestLoader
				.load(
					manifestPath
				);


		await this
			.publicationPreflight
			.check(
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


		const blossomResults =
			await this
				.blossomArtifactPublisher
				.publish(
					loaded.manifest,
					stagingRoot
				);


		const nostrResults =
			await this
				.nostrStagedEventPublisher
				.publish(
					loaded.manifest,
					stagingRoot
				);


		return [
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
	}
}
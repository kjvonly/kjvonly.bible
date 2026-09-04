import {
	resolve
} from 'node:path';

import type {
	Manifest
} from '../domain/manifest.js';

import type {
	ManifestLoader
} from '../ports/manifest-loader.js';

import type {
	SignedEventStagingRepository
} from '../ports/signed-event-staging-repository.js';

import {
	InlineEventBuilder
} from './inline-event-builder.js';

import {
	SourceExpander
} from './source-expander.js';


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

		private readonly eventBuilder:
			InlineEventBuilder,

		private readonly stagingRepository:
			SignedEventStagingRepository
	) {}


	async build(
		manifestPath:
			string
	): Promise<void> {

		const loaded =
			await this.manifestLoader.load(
				manifestPath
			);


		this.assertSupportedManifest(
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
			const sources =
				await this.sourceExpander
					.expand({
						manifestDirectory:
							loaded.directory,

						resourceName,

						resource
					});


			for (
				const source
				of sources
			) {
				const event =
					await this.eventBuilder
						.build(
							source,
							loaded
								.manifest
								.kind
						);


				await this
					.stagingRepository
					.stage({
						stagingRoot,

						resourceName,

						key:
							source.key,

						event
					});
			}
		}
	}


	private assertSupportedManifest(
		manifest:
			Manifest
	): void {

		if (
			Object.keys(
				manifest.collections
			).length > 0
		) {
			throw new Error(
				'Collection building is not implemented yet.'
			);
		}


		for (
			const [
				resourceName,
				resource
			]
			of Object.entries(
				manifest.resources
			)
		) {
			if (
				resource[
					'object-upload'
				] !== undefined
			) {
				throw new Error(
					`Resource "${resourceName}" uses object-upload, which is not implemented yet.`
				);
			}
		}
	}
}
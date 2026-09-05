import type {
	ManifestLoader
} from '../ports/manifest-loader.js';

import {
	PublicationPreflight
} from './publication-preflight.js';


export interface PublishManifest {

	publish(
		manifestPath:
			string
	): Promise<void>;
}


export class PublishManifestUseCase
	implements PublishManifest {

	constructor(
		private readonly manifestLoader:
			ManifestLoader,

		private readonly publicationPreflight:
			PublicationPreflight
	) {}


	async publish(
		manifestPath:
			string
	): Promise<void> {

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


		throw new Error(
			'Publication after preflight is not implemented yet.'
		);
	}
}
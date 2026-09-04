import type {
	ManifestLoader
} from '../ports/manifest-loader.js';

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
			SourceExpander
	) {}


	async build(
		manifestPath:
			string
	): Promise<void> {

		const loaded =
			await this.manifestLoader.load(
				manifestPath
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
			await this.sourceExpander
				.expand({
					manifestDirectory:
						loaded.directory,

					resourceName,

					resource
				});
		}


		throw new Error(
			'Build is not implemented beyond source expansion yet.'
		);
	}
}
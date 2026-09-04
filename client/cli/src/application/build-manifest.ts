import type {
	ManifestLoader
} from '../ports/manifest-loader.js';


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
			ManifestLoader
	) {}


	async build(
		manifestPath:
			string
	): Promise<void> {

		await this.manifestLoader.load(
			manifestPath
		);


		throw new Error(
			'Build is not implemented beyond manifest validation yet.'
		);
	}
}
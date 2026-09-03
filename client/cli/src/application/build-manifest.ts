export interface BuildManifest {
	build(
		manifestPath: string
	): Promise<void>;
}


export class BuildManifestUseCase
	implements BuildManifest {

	async build(
		_manifestPath: string
	): Promise<void> {
		throw new Error(
			'BuildManifest is not implemented yet.'
		);
	}
}
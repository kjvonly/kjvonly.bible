export interface PublishManifest {
	publish(
		manifestPath: string
	): Promise<void>;
}


export class PublishManifestUseCase
	implements PublishManifest {

	async publish(
		_manifestPath: string
	): Promise<void> {
		throw new Error(
			'PublishManifest is not implemented yet.'
		);
	}
}
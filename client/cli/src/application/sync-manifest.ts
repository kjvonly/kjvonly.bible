import type {
	BuildManifest
} from './build-manifest.js';

import type {
	PublishManifest
} from './publish-manifest.js';


export interface SyncManifest {
	sync(
		manifestPath: string
	): Promise<void>;
}


export class SyncManifestUseCase
	implements SyncManifest {

	constructor(
		private readonly buildManifest:
			BuildManifest,

		private readonly publishManifest:
			PublishManifest
	) {}


	async sync(
		manifestPath: string
	): Promise<void> {
		await this.buildManifest.build(
			manifestPath
		);

		await this.publishManifest.publish(
			manifestPath
		);
	}
}
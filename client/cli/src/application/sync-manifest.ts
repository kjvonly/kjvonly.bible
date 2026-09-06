import type {
	BuildManifest
} from './build-manifest.js';

import type {
	PublishManifest
} from './publish-manifest.js';

import type {
	Logger
} from '../ports/logger.js';


export interface SyncManifest {
	sync(
		manifestPath:
			string
	): Promise<void>;
}


export class SyncManifestUseCase
	implements SyncManifest {

	constructor(
		private readonly buildManifest:
			BuildManifest,

		private readonly publishManifest:
			PublishManifest,

		private readonly logger:
			Logger
	) {}


	async sync(
		manifestPath:
			string
	): Promise<void> {

		this.logger.verbose(
			'sync.build.start',
			{
				manifestPath
			}
		);


		await this.buildManifest.build(
			manifestPath
		);


		this.logger.verbose(
			'sync.build.complete',
			{
				manifestPath
			}
		);


		this.logger.verbose(
			'sync.publish.start',
			{
				manifestPath
			}
		);


		await this.publishManifest.publish(
			manifestPath
		);


		this.logger.verbose(
			'sync.publish.complete',
			{
				manifestPath
			}
		);
	}
}
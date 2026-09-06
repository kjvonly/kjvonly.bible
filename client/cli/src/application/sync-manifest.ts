

import type {
	PublishManifest
} from './publish-manifest.js';

import type {
	Logger
} from '../ports/logger.js';
import { BuildManifest } from './build/build-manifest.js';


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

		this.logBuildStart(
			manifestPath
		);


		await this.buildManifest.build(
			manifestPath
		);


		this.logBuildComplete(
			manifestPath
		);


		this.logPublishStart(
			manifestPath
		);


		await this.publishManifest.publish(
			manifestPath
		);


		this.logPublishComplete(
			manifestPath
		);
	}


	private logBuildStart(
		manifestPath:
			string
	): void {

		this.logger.verbose(
			'sync.build.start',
			{
				manifestPath
			}
		);
	}


	private logBuildComplete(
		manifestPath:
			string
	): void {

		this.logger.verbose(
			'sync.build.complete',
			{
				manifestPath
			}
		);
	}


	private logPublishStart(
		manifestPath:
			string
	): void {

		this.logger.verbose(
			'sync.publish.start',
			{
				manifestPath
			}
		);
	}


	private logPublishComplete(
		manifestPath:
			string
	): void {

		this.logger.verbose(
			'sync.publish.complete',
			{
				manifestPath
			}
		);
	}
}
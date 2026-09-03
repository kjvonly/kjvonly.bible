import {
	BuildManifestUseCase
} from '../application/build-manifest.js';

import {
	PublishManifestUseCase
} from '../application/publish-manifest.js';

import {
	SyncManifestUseCase
} from '../application/sync-manifest.js';

import {
	createCli
} from '../cli/create-cli.js';


export function createCliComposition() {

	const buildManifest =
		new BuildManifestUseCase();


	const publishManifest =
		new PublishManifestUseCase();


	const syncManifest =
		new SyncManifestUseCase(
			buildManifest,
			publishManifest
		);


	const cli =
		createCli({
			buildManifest,
			publishManifest,
			syncManifest
		});


	return {
		cli
	};
}
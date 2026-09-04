import {
	resolve
} from 'node:path';

import {
	NodeManifestLoader
} from '../adapters/manifest/node-manifest-loader.js';

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

import {
	NodeSourceRepository
} from '../adapters/source/node-source-repository.js';

import {
	SourceExpander
} from '../application/source-expander.js';

export function createCliComposition() {

	const workingDirectory =
		process.cwd();


	const manifestLoader =
		new NodeManifestLoader({
			workingDirectory,

			envFilePath:
				resolve(
					workingDirectory,
					'.env'
				),

			runtimeEnvironment:
				process.env
		});

	const sourceRepository =
		new NodeSourceRepository();


	const sourceExpander =
		new SourceExpander(
			sourceRepository
		);

	const buildManifest =
		new BuildManifestUseCase(
			manifestLoader,
			sourceExpander
		);


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
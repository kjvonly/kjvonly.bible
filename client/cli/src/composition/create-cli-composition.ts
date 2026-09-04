import {
	resolve
} from 'node:path';

import {
	GzipEncoder
} from '../adapters/encoding/gzip-encoder.js';

import {
	HexEncoder
} from '../adapters/encoding/hex-encoder.js';

import {
	NodeManifestLoader
} from '../adapters/manifest/node-manifest-loader.js';

import {
	LocalNostrSigner
} from '../adapters/nostr/local-nostr-signer.js';

import {
	NodeSourceRepository
} from '../adapters/source/node-source-repository.js';

import {
	NodeSignedEventStagingRepository
} from '../adapters/staging/node-signed-event-staging-repository.js';

import {
	SystemClock
} from '../adapters/time/system-clock.js';

import {
	BuildManifestUseCase
} from '../application/build-manifest.js';

import {
	EncodingRegistry
} from '../application/encoding/encoding-registry.js';

import {
	InlineEventBuilder
} from '../application/inline-event-builder.js';

import {
	PublishManifestUseCase
} from '../application/publish-manifest.js';

import {
	SourceExpander
} from '../application/source-expander.js';

import {
	SyncManifestUseCase
} from '../application/sync-manifest.js';

import {
	createCli
} from '../cli/create-cli.js';


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


	const encodingRegistry =
		new EncodingRegistry([
			new GzipEncoder(),
			new HexEncoder()
		]);


	const signer =
		new LocalNostrSigner(
			process.env
				.NOSTR_SECRET_KEY
		);


	const clock =
		new SystemClock();


	const eventBuilder =
		new InlineEventBuilder(
			sourceRepository,
			encodingRegistry,
			signer,
			clock
		);


	const stagingRepository =
		new NodeSignedEventStagingRepository();


	const buildManifest =
		new BuildManifestUseCase(
			manifestLoader,
			sourceExpander,
			sourceRepository,
			eventBuilder,
			signer,
			stagingRepository
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
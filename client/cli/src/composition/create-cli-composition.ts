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

import {
	BlossomDescriptorStrategyBuilder
} from '../adapters/strategy/blossom-descriptor-strategy-builder.js';

import {
	NodeArtifactStagingRepository
} from '../adapters/staging/node-artifact-staging-repository.js';

import {
	DescriptorBackedResourceBuilder
} from '../application/descriptor-backed-resource-builder.js';

import {
	DescriptorEventBuilder
} from '../application/descriptor-event-builder.js';

import {
	DescriptorStrategyRegistry
} from '../application/descriptor-strategy-registry.js';

import {
	ObjectArtifactStager
} from '../application/object-artifact-stager.js';

import {
	ResourceDescriptorBuilder
} from '../application/resource-descriptor-builder.js';

import {
	NodeCollectionEventStagingRepository
} from '../adapters/staging/node-collection-event-staging-repository.js';

import {
	CollectionBuilder
} from '../application/collection-builder.js';

import {
	CollectionEventBuilder
} from '../application/collection-event-builder.js';

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
	const artifactStagingRepository =
		new NodeArtifactStagingRepository();


	const objectArtifactStager =
		new ObjectArtifactStager(
			sourceRepository,
			encodingRegistry,
			artifactStagingRepository
		);


	const descriptorStrategyRegistry =
		new DescriptorStrategyRegistry([
			new BlossomDescriptorStrategyBuilder()
		]);


	const resourceDescriptorBuilder =
		new ResourceDescriptorBuilder();


	const descriptorEventBuilder =
		new DescriptorEventBuilder(
			encodingRegistry,
			signer,
			clock,
			resourceDescriptorBuilder
		);

	const descriptorBackedResourceBuilder =
		new DescriptorBackedResourceBuilder(
			objectArtifactStager,
			descriptorStrategyRegistry,
			descriptorEventBuilder,
			resourceDescriptorBuilder,
			signer,
			stagingRepository
		);

	const collectionEventStagingRepository =
		new NodeCollectionEventStagingRepository();


	const collectionEventBuilder =
		new CollectionEventBuilder(
			encodingRegistry,
			signer,
			clock
		);


	const collectionBuilder =
		new CollectionBuilder(
			collectionEventBuilder,
			collectionEventStagingRepository
		);

	const buildManifest =
		new BuildManifestUseCase(
			manifestLoader,
			sourceExpander,
			sourceRepository,
			eventBuilder,
			signer,
			stagingRepository,
			descriptorBackedResourceBuilder,
			collectionBuilder
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
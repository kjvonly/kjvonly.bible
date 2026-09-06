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
	NodeSourceRepository
} from '../adapters/source/node-source-repository.js';

import {
	NodeSignedEventStagingRepository
} from '../adapters/staging/node-signed-event-staging-repository.js';

import {
	SystemClock
} from '../adapters/time/system-clock.js';

import {
	SyncManifestUseCase
} from '#application/sync/sync-manifest.js';

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
	NodeCollectionEventStagingRepository
} from '../adapters/staging/node-collection-event-staging-repository.js';

import { NodeBlossomPreflight } from '../adapters/blossom/node-blossom-preflight.js';
import { NodeBlossomPublicationClient } from '../adapters/blossom/node-blossom-publication-client.js';



import {
	NodeNostrEventStagingRepository
} from '../adapters/staging/node-nostr-event-staging-repository.js';

//application
import { ConsoleLogger } from '../adapters/logging/console-logger.js';
import { ObjectArtifactStager } from '#application/build/artifact/object-artifact-stager.js';
import { BuildManifestUseCase } from '#application/build/build-manifest.js';
import { CollectionBuilder } from '#application/build/collection/collection-builder.js';
import { CollectionEventBuilder } from '#application/build/collection/collection-event-builder.js';
import { DescriptorBackedResourceBuilder } from '#application/build/descriptor/descriptor-backed-resource-builder.js';
import { DescriptorEventBuilder } from '#application/build/descriptor/descriptor-event-builder.js';
import { DescriptorStrategyRegistry } from '#application/build/descriptor/descriptor-strategy-registry.js';
import { ResourceDescriptorBuilder } from '#application/build/descriptor/resource-descriptor-builder.js';
import { EncodingRegistry } from '#application/build/encoding/encoding-registry.js';
import { InlineEventBuilder } from '#application/build/inline/inline-event-builder.js';
import { SourceExpander } from '#application/build/source/source-expander.js';
import { BlossomArtifactPublisher } from '#application/publish/blossom/blossom-artifact-publisher.js';
import { NostrStagedEventPublisher } from '#application/publish/nostr/nostr-staged-event-publisher.js';
import { PublicationPreflight } from '#application/publish/preflight/publication-preflight.js';
import { PublishManifestUseCase } from '#application/publish/publish-manifest.js';
import { NostrToolsEventPublisher } from '../adapters/nostr/publication/nostr-tools-event-publisher.js';
import { connectNodeNostrToolsRelay } from '../adapters/nostr/relay/connect-node-nostr-tools-relay.js';
import { NostrToolsRelayPreflight } from '../adapters/nostr/relay/nostr-tools-relay-preflight.js';
import { NostrToolsRelayReconciler } from '../adapters/nostr/relay/nostr-tools-relay-reconciler.js';
import { LocalNostrSigner } from '../adapters/nostr/signer/local-nostr-signer.js';

export function createCliComposition() {
	const logger =
		new ConsoleLogger(
			false
		);

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
			artifactStagingRepository,
			logger
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
			stagingRepository,
			logger
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
			collectionEventStagingRepository,
			logger
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
			collectionBuilder,
			logger
		);


	const publicationPreflight =
		new PublicationPreflight(
			new NostrToolsRelayPreflight(logger),
			new NodeBlossomPreflight(logger),
			logger
		);

	const blossomPublicationClient =
		new NodeBlossomPublicationClient(
			signer,
			clock,
			logger
		);


	const blossomArtifactPublisher =
		new BlossomArtifactPublisher(
			artifactStagingRepository,
			sourceRepository,
			blossomPublicationClient,
			logger
		);

	const nostrEventStagingRepository =
		new NodeNostrEventStagingRepository(
			stagingRepository,
			collectionEventStagingRepository
		);

	const nostrRelayReconciler =
		new NostrToolsRelayReconciler(
			signer,
			connectNodeNostrToolsRelay,
			logger
		);


	const nostrEventPublisher =
		new NostrToolsEventPublisher(
			signer,
			logger
		);


	const nostrStagedEventPublisher =
		new NostrStagedEventPublisher(
			nostrEventStagingRepository,
			signer,
			nostrRelayReconciler,
			nostrEventPublisher,
			logger
		);

	const publishManifest =
		new PublishManifestUseCase(
			manifestLoader,
			publicationPreflight,
			blossomArtifactPublisher,
			nostrStagedEventPublisher,
			logger
		);

	const syncManifest =
		new SyncManifestUseCase(
			buildManifest,
			publishManifest,
			logger
		);

	const cli =
		createCli({
			buildManifest,
			publishManifest,
			syncManifest,
			setVerbose:
				enabled => {

					logger.setVerboseEnabled(
						enabled
					);
				}
		});


	return {
		cli
	};
}
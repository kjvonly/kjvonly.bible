import {
	resolve
} from 'node:path';

import {
	GzipEncoder
} from '#adapters/encoding/gzip-encoder.js';

import {
	HexEncoder
} from '#adapters/encoding/hex-encoder.js';

import {
	NodeManifestLoader
} from '#adapters/manifest/node-manifest-loader.js';

import {
	NodeSourceRepository
} from '#adapters/source/node-source-repository.js';

import {
	NodeSignedEventStagingRepository
} from '#adapters/staging/node-signed-event-staging-repository.js';

import {
	SystemClock
} from '#adapters/time/system-clock.js';

import {
	SyncManifestUseCase
} from '#application/sync/sync-manifest.js';

import {
	createCli
} from '#cli/create-cli.js';

import {
	BlossomDescriptorStrategyBuilder
} from '#adapters/strategy/blossom-descriptor-strategy-builder.js';

import {
	NodeArtifactStagingRepository
} from '#adapters/staging/node-artifact-staging-repository.js';

import {
	NodeCollectionEventStagingRepository
} from '#adapters/staging/node-collection-event-staging-repository.js';

import {
	NodeFilesystemEventStagingRepository
} from '#adapters/staging/node-filesystem-event-staging-repository.js';

import { NodeBlossomPreflight } from '#adapters/blossom/node-blossom-preflight.js';
import { NodeBlossomPublicationClient } from '#adapters/blossom/node-blossom-publication-client.js';



import {
	NodeNostrEventStagingRepository
} from '#adapters/staging/node-nostr-event-staging-repository.js';

//application
import { ConsoleLogger } from '#adapters/logging/console-logger.js';
import { ObjectArtifactStager } from '#application/build/artifact/object-artifact-stager.js';
import { BuildManifestUseCase } from '#application/build/build-manifest.js';
import { CollectionBuilder } from '#application/build/collection/collection-builder.js';
import { CollectionEventBuilder } from '#application/build/collection/collection-event-builder.js';
import { DescriptorBackedResourceBuilder } from '#application/build/descriptor/descriptor-backed-resource-builder.js';
import { DescriptorEventBuilder } from '#application/build/descriptor/descriptor-event-builder.js';
import { DescriptorStrategyRegistry } from '#application/build/descriptor/descriptor-strategy-registry.js';
import { ResourceDescriptorBuilder } from '#application/build/descriptor/resource-descriptor-builder.js';
import { NostrEventResourceDescriptorBuilder } from '#application/build/descriptor/nostr-event-resource-descriptor-builder.js';
import { FilesystemBuilder } from '#application/build/filesystem/filesystem-builder.js';
import { FilesystemContentBuilder } from '#application/build/filesystem/filesystem-content-builder.js';
import { FilesystemEventBuilder } from '#application/build/filesystem/filesystem-event-builder.js';
import { EncodingRegistry } from '#application/build/encoding/encoding-registry.js';
import { InlineEventBuilder } from '#application/build/inline/inline-event-builder.js';
import { SourceExpander } from '#application/build/source/source-expander.js';
import { ParseUseCase } from '#application/parse/parse.js';
import { ParseDirectoryUseCase } from '#application/parse/batch/parse-directory.js';
import { NodeParseWorkspace } from '#adapters/parse/node-parse-workspace.js';
import { CheerioHtmlParser } from '#application/parse/html/parser/cheerio-html-parser.js';
import {
	OrdinalNormalizedBlockIdGenerator
} from '#application/parse/html/identity/ordinal-normalized-block-id-generator.js';
import { CaptionBlockProcessor } from '#application/parse/html/processors/caption-block-processor.js';
import { FigureBlockProcessor } from '#application/parse/html/processors/figure-block-processor.js';
import { HeadingBlockProcessor } from '#application/parse/html/processors/heading-block-processor.js';
import { HtmlBlockProcessorRegistry } from '#application/parse/html/registry/html-block-processor-registry.js';
import { ListBlockProcessor } from '#application/parse/html/processors/list-block-processor.js';
import { ListItemBlockProcessor } from '#application/parse/html/processors/list-item-block-processor.js';
import { ParagraphBlockProcessor } from '#application/parse/html/processors/paragraph-block-processor.js';
import { PreformattedBlockProcessor } from '#application/parse/html/processors/preformatted-block-processor.js';
import { QuoteBlockProcessor } from '#application/parse/html/processors/quote-block-processor.js';
import { TableBlockProcessor } from '#application/parse/html/processors/table-block-processor.js';
import { TableCellBlockProcessor } from '#application/parse/html/processors/table-cell-block-processor.js';
import { TableRowBlockProcessor } from '#application/parse/html/processors/table-row-block-processor.js';
import { TableSectionBlockProcessor } from '#application/parse/html/processors/table-section-block-processor.js';
import { ThematicBreakBlockProcessor } from '#application/parse/html/processors/thematic-break-block-processor.js';
import { TransparentContainerBlockProcessor } from '#application/parse/html/processors/transparent-container-block-processor.js';
import { UnsupportedSemanticBlockProcessor } from '#application/parse/html/processors/unsupported-semantic-block-processor.js';
import { HtmlInlineParser } from '#application/parse/html/inline/html-inline-parser.js';
import { HtmlInlineProcessorRegistry } from '#application/parse/html/inline/html-inline-processor-registry.js';
import { AnchorInlineProcessor } from '#application/parse/html/inline/processors/anchor-inline-processor.js';
import { EmphasisInlineProcessor } from '#application/parse/html/inline/processors/emphasis-inline-processor.js';
import { LineBreakInlineProcessor } from '#application/parse/html/inline/processors/line-break-inline-processor.js';
import { MarkInlineProcessor } from '#application/parse/html/inline/processors/mark-inline-processor.js';
import { StrongInlineProcessor } from '#application/parse/html/inline/processors/strong-inline-processor.js';
import {
	HtmlNormalizedDocumentConverter
} from '#application/parse/html/converter/html-normalized-document-converter.js';
import { BlossomArtifactPublisher } from '#application/publish/blossom/blossom-artifact-publisher.js';
import { NostrStagedEventPublisher } from '#application/publish/nostr/nostr-staged-event-publisher.js';
import { PublicationPreflight } from '#application/publish/preflight/publication-preflight.js';
import { PublishManifestUseCase } from '#application/publish/publish-manifest.js';
import { NostrToolsEventPublisher } from '#adapters/nostr/publication/nostr-tools-event-publisher.js';
import { connectNodeNostrToolsRelay } from '#adapters/nostr/relay/connect-node-nostr-tools-relay.js';
import { NostrToolsRelayPreflight } from '#adapters/nostr/relay/nostr-tools-relay-preflight.js';
import { NostrToolsRelayReconciler } from '#adapters/nostr/relay/nostr-tools-relay-reconciler.js';
import { LocalNostrSigner } from '#adapters/nostr/signer/local-nostr-signer.js';
import { NormalizedDocumentValidator } from '@kjvonly/normalized-content';

export function createCliComposition() {
	// =============================================================================
	// Shared
	const logger =
		new ConsoleLogger(
			false
		);


	// =============================================================================
	// Parse
	const htmlParser =
		new CheerioHtmlParser();

	const normalizedDocumentValidator =
		new NormalizedDocumentValidator();

	const htmlBlockProcessorRegistry =
		new HtmlBlockProcessorRegistry([
			new CaptionBlockProcessor(),
			new FigureBlockProcessor(),
			new HeadingBlockProcessor(),
			new ParagraphBlockProcessor(),
			new PreformattedBlockProcessor(),
			new TableBlockProcessor(),
			new TableCellBlockProcessor(),
			new TableRowBlockProcessor(),
			new TableSectionBlockProcessor(),
			new ThematicBreakBlockProcessor(),
			new QuoteBlockProcessor(),
			new ListBlockProcessor(),
			new ListItemBlockProcessor(),
			new TransparentContainerBlockProcessor(),
			new UnsupportedSemanticBlockProcessor()
		]);

	const htmlInlineProcessorRegistry =
		new HtmlInlineProcessorRegistry([
			new LineBreakInlineProcessor(),
			new AnchorInlineProcessor(),
			new EmphasisInlineProcessor(),
			new StrongInlineProcessor(),
			new MarkInlineProcessor(
				[
					'sup'
				],
				'superscript'
			),
			new MarkInlineProcessor(
				[
					'sub'
				],
				'subscript'
			),
			new MarkInlineProcessor(
				[
					'u'
				],
				'underline'
			),
			new MarkInlineProcessor(
				[
					'del',
					's',
					'strike'
				],
				'strikethrough'
			),
			new MarkInlineProcessor(
				[
					'small'
				],
				'small'
			),
			new MarkInlineProcessor(
				[
					'code'
				],
				'code'
			),
			new MarkInlineProcessor(
				[
					'mark'
				],
				'highlight'
			)
		]);

	const htmlInlineParser =
		new HtmlInlineParser(
			htmlInlineProcessorRegistry,
			tag =>
				htmlBlockProcessorRegistry.has(
					tag
				)
		);

	/**
	 * Creates document-scoped ID state so collision counters never leak between
	 * independent HTML conversions.
	 */
	const createNormalizedBlockIdGenerator =
		() =>
			new OrdinalNormalizedBlockIdGenerator();

	const htmlNormalizedDocumentConverter =
		new HtmlNormalizedDocumentConverter(
			normalizedDocumentValidator,
			htmlBlockProcessorRegistry,
			htmlInlineParser,
			createNormalizedBlockIdGenerator
		);

	const parse =
		new ParseUseCase(
			htmlParser,
			htmlNormalizedDocumentConverter
		);

	const parseWorkspace =
		new NodeParseWorkspace();

	const parseDirectory =
		new ParseDirectoryUseCase(
			parse,
			parseWorkspace
		);


	// =============================================================================
	// Manifest / Build / Publish / Sync
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


	const nostrEventResourceDescriptorBuilder =
		new NostrEventResourceDescriptorBuilder();


	const collectionBuilder =
		new CollectionBuilder(
			collectionEventBuilder,
			nostrEventResourceDescriptorBuilder,
			collectionEventStagingRepository,
			logger
		);


	const filesystemEventStagingRepository =
		new NodeFilesystemEventStagingRepository();


	const filesystemContentBuilder =
		new FilesystemContentBuilder(
			stagingRepository,
			collectionEventStagingRepository,
			nostrEventResourceDescriptorBuilder
		);


	const filesystemEventBuilder =
		new FilesystemEventBuilder(
			encodingRegistry,
			signer,
			clock
		);


	const filesystemBuilder =
		new FilesystemBuilder(
			filesystemContentBuilder,
			filesystemEventBuilder,
			filesystemEventStagingRepository,
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
			filesystemBuilder,
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
			collectionEventStagingRepository,
			filesystemEventStagingRepository
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


	// =============================================================================
	// CLI
	const cli =
		createCli({
			parseDirectory,
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
		cli,
		parse
	};
}

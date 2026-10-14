import {
	ContentRepresentationResolver
} from '$lib/resource/resolution/content-representation-resolver';

import {
	DescriptorsRepresentationResolver
} from '$lib/resource/resolution/descriptors-representation-resolver';

import {
	ResourceResolver
} from '$lib/resource/resolution/resource-resolver';

import {
	BlossomResourceResolutionStrategy
} from '$lib/resource/resolution/blossom-resource-resolution-strategy';

import type {
	ResourceResolutionStrategy
} from '$lib/resource/resolution/resource-resolution-strategy';

import {
	ResourceResolutionStrategyRegistry
} from '$lib/resource/resolution/resource-resolution-strategy-registry';

import {
	ResourceDescriptorContentResolver
} from '$lib/resource/resolution/resource-descriptor-content-resolver';

import {
	ResourceDescriptorCurrentness
} from '$lib/resource/resolution/resource-descriptor-currentness';

import {
	ResourceDescriptorPreparer
} from '$lib/resource/resolution/resource-descriptor-preparer';

import {
	ResourceDescriptorTerminalResolver
} from '$lib/resource/resolution/resource-descriptor-terminal-resolver';

import {
	ResourceDescriptorGraphResolver
} from '$lib/resource/resolution/resource-descriptor-graph-resolver';

import {
	ResourceContentDecoratorBuilder
} from '$lib/resource/content/resource-content-decorator-builder';

import {
	ResourceContentDecoder
} from '$lib/resource/content/resource-content-decoder';

import {
	JsonResourceContentDecorator
} from '$lib/resource/content/json-resource-content-decorator';

import {
	GzipResourceContentDecorator
} from '$lib/resource/content/gzip-resource-content-decorator';

import {
	HexResourceContentDecorator
} from '$lib/resource/content/hex-resource-content-decorator';

import {
	ResourceDescriptorDocumentDecoder
} from '$lib/resource/descriptors/resource-descriptor-document-decoder';

import {
	ResourceDescriptorValidator
} from '$lib/resource/descriptors/resource-descriptor-validator';

import {
	IndexedDBResourceReceiptStore
} from '$lib/resource/receipts/indexeddb-resource-receipt-store';

import {
	ResourceReceiptService
} from '$lib/resource/receipts/resource-receipt.service';

import type {
	ResourceHandler
} from '$lib/resource/installation/resource-handler';

import {
	ResourceDataTypeResolver
} from '$lib/resource/data-types/resource-data-type-resolver';

import {
	ResourceDomainObjectFactoryResolver
} from '$lib/resource/domain-objects/resource-domain-object-factory-resolver';

import {
	GenericResourceInstaller
} from '$lib/resource/installation/generic-resource-installer';

import {
	IndexedDBGenericResourceInstallationTransaction
} from '$lib/resource/installation/indexeddb-generic-resource-installation-transaction';

import {
	ResourceProcessor
} from '$lib/resource/services/resource-processor';

import {
	ResourceDescriptorProcessor
} from '$lib/resource/services/resource-descriptor-processor';

import {
	ResourceResolutionProcessor
} from '$lib/resource/services/resource-resolution-processor';

import {
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

///////////////////////////////////////////////////////////////////////////////
// Bible Chapter

import {
	BibleChapterDataTypeHandler,
	BibleChapterDomainObjectFactory
} from '$lib/domains/bible';

///////////////////////////////////////////////////////////////////////////////
// Bible Booknames

import {
	BibleBooknamesDataTypeHandler,
	BibleBooknamesDomainObjectFactory
} from '$lib/domains/bible';

///////////////////////////////////////////////////////////////////////////////
// Bible Paragraphs

import {
	BibleParagraphsDataTypeHandler,
	BibleParagraphsDomainObjectFactory
} from '$lib/domains/bible';

///////////////////////////////////////////////////////////////////////////////
// Bible Pericopes

import {
	BiblePericopesDataTypeHandler,
	BiblePericopesDomainObjectFactory
} from '$lib/domains/bible';

///////////////////////////////////////////////////////////////////////////////
// Bible Text Markup

import {
	BibleTextMarkupDataTypeHandler,
	BibleTextMarkupDomainObjectFactory
} from '$lib/domains/bible';

///////////////////////////////////////////////////////////////////////////////
// Bible Search Index

import {
	BibleSearchIndexDataTypeHandler,
	BibleSearchIndexDomainObjectFactory
} from '$lib/domains/bible';


///////////////////////////////////////////////////////////////////////////////
// Filesystem

import {
	FilesystemEntriesDataTypeHandler,
	FilesystemInstaller,
	FilesystemInterpreter,
	FilesystemResourceHandler,
	FilesystemValidator,
	IndexedDBFilesystemInstallationTransaction
} from '$lib/domains/filesystem';

///////////////////////////////////////////////////////////////////////////////
// Normalized Content

import {
	NormalizedDocumentValidator
} from '@kjvonly/normalized-content';

import {
	NormalizedContentDomainObjectFactory,
	NormalizedContentTextMarkupDataTypeHandler,
	NormalizedContentTextMarkupDomainObjectFactory,
	NormalizedDocumentDataTypeHandler
} from '$lib/domains/normalized-content';

///////////////////////////////////////////////////////////////////////////////
// Notes

import {
	NoteDataTypeHandler,
	NoteDomainObjectFactory
} from '$lib/domains/notes';

///////////////////////////////////////////////////////////////////////////////
// Bookmarks

import {
    BookmarkDataTypeHandler,
    BookmarkDomainObjectFactory
} from '$lib/domains/bookmarks';

///////////////////////////////////////////////////////////////////////////////
// Reading Plans

import {
	PlanDefinitionDataTypeHandler,
	PlanDefinitionDomainObjectFactory,
	PlanSubscriptionDataTypeHandler,
	PlanSubscriptionDomainObjectFactory,
	PlanProgressDataTypeHandler,
	PlanProgressDomainObjectFactory
} from '$lib/domains/reading-plans';

///////////////////////////////////////////////////////////////////////////////
// Strong's

import {
	StrongsDataTypeHandler,
	StrongsDefinitionDataTypeHandler,
	StrongsDomainObjectFactory
} from '$lib/domains/strongs';

interface ResourceProcessingDependencies {
	readonly decoratorBuilder:
		ResourceContentDecoratorBuilder;

	readonly decoder:
		ResourceContentDecoder;

	readonly receipts:
		ResourceReceiptService;

	readonly genericInstaller:
		GenericResourceInstaller;

	readonly handlers:
		readonly ResourceHandler[];
}

export function createContentResourceProcessor():
	ResourceProcessor {

	const dependencies =
		createResourceProcessingDependencies();

	const resolver =
		new ResourceResolver([
			new ContentRepresentationResolver()
		]);

	const resolutionProcessor =
		new ResourceResolutionProcessor(
			dependencies.decoder,
			dependencies.receipts,
			dependencies.genericInstaller,
			dependencies.handlers
		);

	return new ResourceProcessor(
		resolver,
		resolutionProcessor
	);
}

export interface DescriptorResourceProcessors {
	readonly representation:
		ResourceProcessor;

	readonly descriptor:
		ResourceDescriptorProcessor;
}

/**
 * Composes the descriptor worker's representation and already-known descriptor
 * entry points over one shared descriptor graph and installation lifecycle.
 */
export function createDescriptorResourceProcessors(
	remoteStrategyResolver:
		Pick<
			ResourceResolutionStrategy,
			'resolve'
		>
): DescriptorResourceProcessors {

	const dependencies =
		createResourceProcessingDependencies();

	const descriptorDocumentDecoder =
		new ResourceDescriptorDocumentDecoder(
			dependencies.decoratorBuilder
		);

	const descriptorValidator =
		new ResourceDescriptorValidator();

	const blossomStrategy =
		new BlossomResourceResolutionStrategy();

	const nostrStrategy:
		ResourceResolutionStrategy = {
			type:
				'nostr',

			resolve:
				(descriptor) =>
					remoteStrategyResolver.resolve(
						descriptor
					)
		};

	const strategyRegistry =
		new ResourceResolutionStrategyRegistry([
			blossomStrategy,
			nostrStrategy
		]);

	const descriptorContentResolver =
		new ResourceDescriptorContentResolver(
			strategyRegistry
		);

	const descriptorCurrentness =
		new ResourceDescriptorCurrentness(
			dependencies.receipts
		);

	const descriptorPreparer =
		new ResourceDescriptorPreparer(
			descriptorValidator,
			descriptorCurrentness
		);

	const descriptorTerminalResolver =
		new ResourceDescriptorTerminalResolver(
			descriptorContentResolver
		);

	const descriptorGraphResolver =
		new ResourceDescriptorGraphResolver(
			descriptorDocumentDecoder,
			descriptorPreparer,
			descriptorContentResolver,
			descriptorTerminalResolver
		);

	const descriptorsResolver =
		new DescriptorsRepresentationResolver(
			descriptorDocumentDecoder,
			descriptorGraphResolver
		);

	const resolver =
		new ResourceResolver([
			descriptorsResolver
		]);

	const resolutionProcessor =
		new ResourceResolutionProcessor(
			dependencies.decoder,
			dependencies.receipts,
			dependencies.genericInstaller,
			dependencies.handlers
		);

	return {
		representation:
			new ResourceProcessor(
				resolver,
				resolutionProcessor
			),

		descriptor:
			new ResourceDescriptorProcessor(
				descriptorGraphResolver,
				resolutionProcessor
			)
	};
}

function createResourceProcessingDependencies():
	ResourceProcessingDependencies {

	const decoratorBuilder =
		new ResourceContentDecoratorBuilder([
			{
				token:
					'application/json',

				decorate:
					(inner) =>
						new JsonResourceContentDecorator(
							inner
						)
			},
			{
				token:
					'gzip',

				decorate:
					(inner) =>
						new GzipResourceContentDecorator(
							inner
						)
			},
			{
				token:
					'hex',

				decorate:
					(inner) =>
						new HexResourceContentDecorator(
							inner
						)
			}
		]);

	const decoder =
		new ResourceContentDecoder(
			decoratorBuilder
		);

	const receiptStore =
		new IndexedDBResourceReceiptStore(
			getApplicationDB
		);

	const receipts =
		new ResourceReceiptService(
			receiptStore
		);

	const normalizedDocumentValidator =
		new NormalizedDocumentValidator();

	const dataTypes =
		new ResourceDataTypeResolver([
			new NormalizedDocumentDataTypeHandler(
				normalizedDocumentValidator
			),
			new NormalizedContentTextMarkupDataTypeHandler(),
			new StrongsDataTypeHandler(),
			new StrongsDefinitionDataTypeHandler(),
			new NoteDataTypeHandler(),
			new BookmarkDataTypeHandler(),
			new BibleChapterDataTypeHandler(),
			new BibleBooknamesDataTypeHandler(),
			new BibleParagraphsDataTypeHandler(),
			new BiblePericopesDataTypeHandler(),
			new BibleTextMarkupDataTypeHandler(),
			new BibleSearchIndexDataTypeHandler(),
			new PlanDefinitionDataTypeHandler(),
			new PlanSubscriptionDataTypeHandler(),
			new PlanProgressDataTypeHandler()
		]);

	const domainObjectFactories =
		new ResourceDomainObjectFactoryResolver([
			new NormalizedContentDomainObjectFactory(),
			new NormalizedContentTextMarkupDomainObjectFactory(),
			new StrongsDomainObjectFactory(),
			new NoteDomainObjectFactory(),
			new BookmarkDomainObjectFactory(),
			new BibleChapterDomainObjectFactory(),
			new BibleBooknamesDomainObjectFactory(),
			new BibleParagraphsDomainObjectFactory(),
			new BiblePericopesDomainObjectFactory(),
			new BibleTextMarkupDomainObjectFactory(),
			new BibleSearchIndexDomainObjectFactory(),
			new PlanDefinitionDomainObjectFactory(),
			new PlanSubscriptionDomainObjectFactory(),
			new PlanProgressDomainObjectFactory()
		]);

	const genericInstallationTransaction =
		new IndexedDBGenericResourceInstallationTransaction(
			getApplicationDB
		);

	const genericInstaller =
		new GenericResourceInstaller(
			dataTypes,
			domainObjectFactories,
			genericInstallationTransaction
		);

	return {
		decoratorBuilder,
		decoder,
		receipts,
		genericInstaller,
		handlers:
			createResourceHandlers()
	};
}

function createResourceHandlers():
	readonly ResourceHandler[] {

	const filesystemInstallationTransaction =
		new IndexedDBFilesystemInstallationTransaction(
			getApplicationDB
		);

	const filesystemInstaller =
		new FilesystemInstaller(
			filesystemInstallationTransaction
		);

	const filesystemResourceHandler =
		new FilesystemResourceHandler(
			new FilesystemEntriesDataTypeHandler(),
			new FilesystemInterpreter(),
			new FilesystemValidator(
				new ResourceDescriptorValidator()
			),
			filesystemInstaller
		);


	return [
		filesystemResourceHandler
	];
}

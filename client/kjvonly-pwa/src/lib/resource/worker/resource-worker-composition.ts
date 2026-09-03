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
	ResourceProcessor
} from '$lib/resource/services/resource-processor';

import {
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

///////////////////////////////////////////////////////////////////////////////
// Bible Chapter

import {
	IndexedDBBibleChapterInstallationTransaction
} from '$lib/domains/bible/persistence/bible-chapter-installation-transaction';

import {
	BibleChapterInstaller
} from '$lib/domains/bible/resources/chapters/bible-chapter-installer';

import {
	BibleChapterInterpreter
} from '$lib/domains/bible/resources/chapters/bible-chapter-interpreter';

import {
	BibleChapterValidator
} from '$lib/domains/bible/resources/chapters/bible-chapter-validator';

import {
	BibleChapterResourceHandler
} from '$lib/domains/bible/resources/chapters/bible-chapter-resource-handler';

///////////////////////////////////////////////////////////////////////////////
// Strong's

import {
	IndexedDBStrongsInstallationTransaction
} from '$lib/domains/strongs/persistence/strongs-installation-transaction';

import {
	StrongsInstaller
} from '$lib/domains/strongs/resources/definitions/strongs-installer';

import {
	StrongsInterpreter
} from '$lib/domains/strongs/resources/definitions/strongs-interpreter';

import {
	StrongsValidator
} from '$lib/domains/strongs/resources/definitions/strongs-validator';

import {
	StrongsResourceHandler
} from '$lib/domains/strongs/resources/definitions/strongs-resource-handler';

interface ResourceProcessingDependencies {
	readonly decoratorBuilder:
		ResourceContentDecoratorBuilder;

	readonly decoder:
		ResourceContentDecoder;

	readonly receipts:
		ResourceReceiptService;

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

	return new ResourceProcessor(
		resolver,
		dependencies.decoder,
		dependencies.receipts,
		dependencies.handlers
	);
}

export function createDescriptorResourceProcessor():
	ResourceProcessor {

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

	const descriptorsResolver =
		new DescriptorsRepresentationResolver(
			descriptorDocumentDecoder,
			descriptorValidator,
			dependencies.receipts,
			[
				blossomStrategy
			]
		);

	const resolver =
		new ResourceResolver([
			descriptorsResolver
		]);

	return new ResourceProcessor(
		resolver,
		dependencies.decoder,
		dependencies.receipts,
		dependencies.handlers
	);
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

	return {
		decoratorBuilder,
		decoder,
		receipts,
		handlers:
			createResourceHandlers()
	};
}

function createResourceHandlers():
	readonly ResourceHandler[] {

	const bibleChapterInstallationTransaction =
		new IndexedDBBibleChapterInstallationTransaction(
			getApplicationDB
		);

	const bibleChapterInstaller =
		new BibleChapterInstaller(
			bibleChapterInstallationTransaction
		);

	const bibleChapterResourceHandler =
		new BibleChapterResourceHandler(
			new BibleChapterInterpreter(),
			new BibleChapterValidator(),
			bibleChapterInstaller
		);

	const strongsInstallationTransaction =
		new IndexedDBStrongsInstallationTransaction(
			getApplicationDB
		);

	const strongsInstaller =
		new StrongsInstaller(
			strongsInstallationTransaction
		);

	const strongsResourceHandler =
		new StrongsResourceHandler(
			new StrongsInterpreter(),
			new StrongsValidator(),
			strongsInstaller
		);

	return [
		bibleChapterResourceHandler,
		strongsResourceHandler
	];
}

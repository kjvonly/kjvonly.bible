import {
	ResourceWorkerDiscovery,
	type ResourceWorkerDiscoveryPort
} from './resource-worker-discovery';

import {
	serializeResourceWorkerError,
	serializeResourceWorkerInstallResult,
	type ResourceWorkerInstallRequest
} from './resource-worker-message';

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

import {
	ResourceService
} from '$lib/resource/services/resource.service';

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
import { ResourceProcessor } from '../services/resource-processor';

///////////////////////////////////////////////////////////////////////////////
// Worker port

const workerPort =
	self as unknown as
	ResourceWorkerDiscoveryPort;

///////////////////////////////////////////////////////////////////////////////
// Discovery
//
// Nostr remains on the main thread.
//
// ResourceService sees the same logical:
//
//     get(reference)
//         → ResourceRepresentation | null
//
// contract as normal ResourceDiscovery.

const resourceDiscovery =
	new ResourceWorkerDiscovery(
		workerPort
	);

///////////////////////////////////////////////////////////////////////////////
// Resource content decoding

const resourceContentDecoratorBuilder =
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

const resourceContentDecoder =
	new ResourceContentDecoder(
		resourceContentDecoratorBuilder
	);

///////////////////////////////////////////////////////////////////////////////
// Resource receipts
//
// This same service is used by:
//
//     DescriptorsRepresentationResolver
//         → needsProcessing()
//
// and:
//
//     ResourceService
//         → markProcessed()
//
// so freshness checking and successful processing remain one policy.

const resourceReceiptStore =
	new IndexedDBResourceReceiptStore(
		getApplicationDB
	);

const resourceReceiptService =
	new ResourceReceiptService(
		resourceReceiptStore
	);

///////////////////////////////////////////////////////////////////////////////
// Descriptor resolution

const resourceDescriptorDocumentDecoder =
	new ResourceDescriptorDocumentDecoder(
		resourceContentDecoratorBuilder
	);

const resourceDescriptorValidator =
	new ResourceDescriptorValidator();

const blossomResourceResolutionStrategy =
	new BlossomResourceResolutionStrategy();

const descriptorsRepresentationResolver =
	new DescriptorsRepresentationResolver(
		resourceDescriptorDocumentDecoder,
		resourceDescriptorValidator,
		resourceReceiptService,
		[
			blossomResourceResolutionStrategy
		]
	);

///////////////////////////////////////////////////////////////////////////////
// Generic Resource resolution

const resourceResolver =
	new ResourceResolver([
		new ContentRepresentationResolver(),
		descriptorsRepresentationResolver
	]);

///////////////////////////////////////////////////////////////////////////////
// Bible Chapter handler

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

///////////////////////////////////////////////////////////////////////////////
// Strong's handler

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

///////////////////////////////////////////////////////////////////////////////
// Resource Service
//
// This is the real Resource lifecycle coordinator.
//
// The only difference from normal main-thread composition is that Discovery
// is represented by ResourceWorkerDiscovery.
const resourceProcessor =
	new ResourceProcessor(
		resourceResolver,
		resourceContentDecoder,
		resourceReceiptService,
		[
			bibleChapterResourceHandler,
			strongsResourceHandler
		]
	);

const resourceService =
	new ResourceService(
		resourceDiscovery,
		resourceProcessor
	);

///////////////////////////////////////////////////////////////////////////////
// Install request host

workerPort.addEventListener(
	'message',
	(event) => {

		const message =
			event.data;

		if (
			message.type !==
			'install'
		) {
			return;
		}

		void handleInstall(
			message
		);
	}
);

async function handleInstall(
	message:
		ResourceWorkerInstallRequest
): Promise<void> {

	try {
		const result =
			await resourceService.install(
				message.reference
			);

		workerPort.postMessage({
			type:
				'install-result',

			requestId:
				message.requestId,

			result:
				serializeResourceWorkerInstallResult(
					result
				)
		});
	} catch (error) {
		workerPort.postMessage({
			type:
				'install-error',

			requestId:
				message.requestId,

			error:
				serializeResourceWorkerError(
					error
				)
		});
	}
}
import {
	serializeResourceWorkerError,
	serializeResourceWorkerInstallResult
} from './resource-worker-message';

import type {
	ResourceChildWorkerMessage,
	ResourceChildWorkerRequest
} from './resource-child-worker-message';

import {
	ContentRepresentationResolver
} from '$lib/resource/resolution/content-representation-resolver';

import {
	ResourceResolver
} from '$lib/resource/resolution/resource-resolver';

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
	IndexedDBResourceReceiptStore
} from '$lib/resource/receipts/indexeddb-resource-receipt-store';

import {
	ResourceReceiptService
} from '$lib/resource/receipts/resource-receipt.service';

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

interface ResourceContentWorkerPort {
	postMessage(
		message:
			ResourceChildWorkerMessage
	): void;

	addEventListener(
		type:
			'message',

		listener:
			(
				event:
					MessageEvent<
						ResourceChildWorkerRequest
					>
			) => void
	): void;
}

const workerPort =
	self as unknown as
		ResourceContentWorkerPort;

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

const resourceReceiptStore =
	new IndexedDBResourceReceiptStore(
		getApplicationDB
	);

const resourceReceiptService =
	new ResourceReceiptService(
		resourceReceiptStore
	);

///////////////////////////////////////////////////////////////////////////////
// Content Resource resolution

const resourceResolver =
	new ResourceResolver([
		new ContentRepresentationResolver()
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
// Resource Processor

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

///////////////////////////////////////////////////////////////////////////////
// Process request host

workerPort.addEventListener(
	'message',
	(event) => {

		const message =
			event.data;

		if (
			message.type !==
			'process'
		) {
			return;
		}

		void handleProcess(
			message
		);
	}
);

async function handleProcess(
	message:
		ResourceChildWorkerRequest
): Promise<void> {

	try {
		const result =
			await resourceProcessor.process(
				message.requested,
				message.representation
			);

		workerPort.postMessage({
			type:
				'process-result',

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
				'process-error',

			requestId:
				message.requestId,

			error:
				serializeResourceWorkerError(
					error
				)
		});
	}
}

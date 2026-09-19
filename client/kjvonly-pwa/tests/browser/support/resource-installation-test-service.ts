import type {
	PublishedResourceReference,
	ResourceHandler,
	ResourceRepresentation,
	ResourceResolutionResult,
	VerifiedResourceContent
} from '$lib/resource';

import {
	JsonResourceContentDecorator,
	ResourceContentDecoder,
	ResourceContentDecoratorBuilder,
	ResourceProcessor,
	ResourceReceiptService,
	ResourceService
} from '$lib/resource';

import {
	getApplicationDB
} from '$lib/infrastructure/persistence/application.db';

import {
	IndexedDBResourceReceiptStore
} from '$lib/resource/receipts/indexeddb-resource-receipt-store';

export interface ResourceInstallationTestInput {
	readonly publisher: string;
	readonly resourceId: string;
	readonly resourceType: string;
	readonly value: unknown;
	readonly modifiedAt?: number;
}

export function createResourceInstallationTestService(
	handler: ResourceHandler,
	input: ResourceInstallationTestInput
): ResourceService {
	const content =
		createVerifiedContent(
			input
		);

	const discovery =
		new FakeDiscovery(
			createRepresentation(
				content
			)
		);

	const resolver =
		new FakeResolver([
			content
		]);

	const decoder =
		createDecoder();

	const receiptStore =
		new IndexedDBResourceReceiptStore(
			getApplicationDB
		);

	const receiptService =
		new ResourceReceiptService(
			receiptStore
		);

	const processor =
		new ResourceProcessor(
			resolver,
			decoder,
			receiptService,
			[
				handler
			]
		);

	return new ResourceService(
		discovery,
		processor
	);
}

export function createBrowserTestPublisher():
	string {
	const value =
		crypto
			.randomUUID()
			.replaceAll(
				'-',
				''
			);

	return (
		value +
		value
	);
}

function createDecoder():
	ResourceContentDecoder {
	const builder =
		new ResourceContentDecoratorBuilder([
			{
				token:
					'application/json',

				decorate:
					(inner) =>
						new JsonResourceContentDecorator(
							inner
						)
			}
		]);

	return new ResourceContentDecoder(
		builder
	);
}

function createVerifiedContent(
	input: ResourceInstallationTestInput
): VerifiedResourceContent {
	const serialized =
		JSON.stringify(
			input.value
		);

	if (
		serialized ===
		undefined
	) {
		throw new Error(
			'Resource installation test value is not JSON serializable.'
		);
	}

	return {
		publisher:
			input.publisher,

		resourceId:
			input.resourceId,

		resourceType:
			input.resourceType,

		modifiedAt:
			input.modifiedAt ??
			200,

		mediaType:
			'application/json',

		content:
			serialized
	};
}

function createRepresentation(
	content: VerifiedResourceContent
): ResourceRepresentation {
	if (
		typeof content.content !==
		'string'
	) {
		throw new Error(
			'Resource installation browser tests require string content.'
		);
	}

	return {
		publisher:
			content.publisher,

		resourceId:
			content.resourceId,

		resourceType:
			content.resourceType,

		eventId:
			'c'.repeat(
				64
			),

		modifiedAt:
			content.modifiedAt,

		representation:
			'content',

		mediaType:
			content.mediaType,

		payload:
			content.content
	};
}

class FakeDiscovery {
	constructor(
		private readonly representation:
			ResourceRepresentation
	) {}

	async get(
		_reference:
			PublishedResourceReference
	): Promise<
		ResourceRepresentation |
		null
	> {
		return this.representation;
	}
}

class FakeResolver {
	constructor(
		private readonly contents:
			readonly VerifiedResourceContent[]
	) {}

	async resolve(
		_resource:
			ResourceRepresentation
	): Promise<
		ResourceResolutionResult
	> {
		return {
			contents:
				this.contents,

			current:
				[],

			failures:
				[]
		};
	}
}

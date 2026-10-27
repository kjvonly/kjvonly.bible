import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	DecodedResourceContent,
	PublishedResourceReference,
	ResourceRepresentation,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import type {
	ResourceHandler
} from '$lib/resource/installation/resource-handler';

import type {
	ResourceResolutionCurrent,
	ResourceResolutionFailure,
	ResourceResolutionResult
} from '$lib/resource/resolution/resource-resolution-result';

import {
	ResourceProcessor
} from './resource-processor';

import {
	ResourceResolutionProcessor
} from './resource-resolution-processor';

describe(
	'ResourceProcessor',
	() => {
		it(
			'decodes and handles a supported Resource',
			async () => {
				const handler =
					new FakeHandler(
						'strongs/definition'
					);

				const decoder =
					new FakeDecoder();

				const receipts =
					new FakeReceiptService();

				const content =
					createVerifiedContent();

				const processor =
					createProcessor({
						contents: [
							content
						],
						decoder,
						receipts,
						handlers: [
							handler
						]
					});

				const result =
					await processor.process(
						createReference(),
						createRepresentation()
					);

				expect(
					result.found
				).toBe(
					true
				);

				expect(
					result.resources
				).toEqual([
					{
						reference: {
							publisher:
								content.publisher,

							resourceId:
								content.resourceId
						},

						resourceType:
							content.resourceType,

						status:
							'handled'
					}
				]);

				expect(
					decoder.contents
				).toEqual([
					content
				]);

				expect(
					handler.resources
				).toHaveLength(
					1
				);

				expect(
					receipts.calls
				).toEqual([
					{
						publisher:
							content.publisher,

						resourceId:
							content.resourceId,

						modifiedAt:
							content.modifiedAt
					}
				]);
			}
		);

		it(
			'handles already decoded Resource content without invoking the decoder',
			async () => {
				const handler =
					new FakeHandler(
						'notes/note'
					);

				const decoder =
					new FakeDecoder();

				const receipts =
					new FakeReceiptService();

				const processor =
					createProcessor({
						contents:
							[],
						decoder,
						receipts,
						handlers: [
							handler
						]
					});

				const decoded:
					DecodedResourceContent = {
						publisher:
							'publisher',
						resourceId:
							'kjvonly/notes/entries/default/note-1',
						resourceType:
							'notes/note',

						dataType:
							'kjvonly.note',

						dataVersion:
							1,
						modifiedAt:
							200,
						mediaType:
							'application/json+gzip+hex',
						value: {
							text:
								'note'
						}
					};

				const outcome =
					await processor.processDecoded(
						decoded
					);

				expect(
					outcome.status
				).toBe(
					'handled'
				);

				expect(
					decoder.contents
				).toHaveLength(
					0
				);

				expect(
					handler.resources
				).toEqual([
					decoded
				]);

				expect(
					receipts.calls
				).toEqual([
					{
						publisher:
							decoded.publisher,
						resourceId:
							decoded.resourceId,
						modifiedAt:
							decoded.modifiedAt
					}
				]);
			}
		);

		it(
			'folds a Resource resolution failure into the install result',
			async () => {
				const error =
					new Error(
						'Blossom retrieval failed.'
					);

				const processor =
					createProcessor({
						contents:
							[],

						failures: [
							{
								publisher:
									'publisher',

								resourceId:
									'kjvonly/bible/chapters/kjvs',

								resourceType:
									'bible/chapter',

								error
							}
						]
					});

				const result =
					await processor.process(
						createReference(),
						createRepresentation()
					);

				expect(
					result.resources
				).toEqual([
					{
						reference: {
							publisher:
								'publisher',

							resourceId:
								'kjvonly/bible/chapters/kjvs'
						},

						resourceType:
							'bible/chapter',

						status:
							'failed',

						error
					}
				]);
			}
		);

		it(
			'preserves an identity-less Resource resolution failure',
			async () => {
				const error =
					new Error(
						'Invalid Resource descriptor.'
					);

				const processor =
					createProcessor({
						contents:
							[],

						failures: [
							{
								error
							}
						]
					});

				const result =
					await processor.process(
						createReference(),
						createRepresentation()
					);

				expect(
					result.resources
				).toEqual([
					{
						status:
							'failed',

						error
					}
				]);
			}
		);

		it(
			'preserves a current Resource without decoding handling or writing a receipt',
			async () => {
				const decoder =
					new FakeDecoder();

				const receipts =
					new FakeReceiptService();

				const handler =
					new FakeHandler(
						'bible/chapter'
					);

				const current:
					ResourceResolutionCurrent = {
					publisher:
						'publisher',

					resourceId:
						'kjvonly/bible/chapters/kjvs',

					resourceType:
						'bible/chapter'
				};

				const processor =
					createProcessor({
						contents:
							[],

						current: [
							current
						],

						decoder,
						receipts,
						handlers: [
							handler
						]
					});

				const result =
					await processor.process(
						createReference(),
						createRepresentation()
					);

				expect(
					result.resources
				).toEqual([
					{
						reference: {
							publisher:
								current.publisher,

							resourceId:
								current.resourceId
						},

						resourceType:
							current.resourceType,

						status:
							'current'
					}
				]);

				expect(
					decoder.contents
				).toHaveLength(
					0
				);

				expect(
					handler.resources
				).toHaveLength(
					0
				);

				expect(
					receipts.calls
				).toHaveLength(
					0
				);
			}
		);

		it(
			'folds resolution failures and continues processing resolved Resources',
			async () => {
				const error =
					new Error(
						'Resource resolution failed'
					);

				const content =
					createVerifiedContent();

				const receipts =
					new FakeReceiptService();

				const processor =
					createProcessor({
						contents: [
							content
						],

						failures: [
							{
								error
							}
						],

						receipts
					});

				const result =
					await processor.process(
						createReference(),
						createRepresentation()
					);

				expect(
					result.resources
				).toEqual([
					{
						status:
							'failed',

						error
					},
					{
						reference: {
							publisher:
								content.publisher,

							resourceId:
								content.resourceId
						},

						resourceType:
							content.resourceType,

						status:
							'handled'
					}
				]);

				expect(
					receipts.calls
				).toHaveLength(
					1
				);
			}
		);

		it(
			'falls back to generic installation when no legacy Resource handler owns the Resource Type',
			async () => {
				const decoder =
					new FakeDecoder();

				const receipts =
					new FakeReceiptService();

				const genericInstaller = {
					install:
						vi.fn(
							async () =>
								undefined
						)
				};

				const content =
					createVerifiedContent({
						resourceType:
							'future/thing',

						resourceId:
							'kjvonly/future/things/default',

						dataType:
							'kjvonly.future-thing',

						dataVersion:
							1
					});

				const processor =
					createProcessor({
						contents: [
							content
						],
						decoder,
						receipts,
						genericInstaller,
						handlers:
							[]
					});

				const result =
					await processor.process(
						createReference(),
						createRepresentation()
					);

				expect(
					result.resources
				).toEqual([
					{
						reference: {
							publisher:
								content.publisher,

							resourceId:
								content.resourceId
						},

						resourceType:
							content.resourceType,

						status:
							'handled'
					}
				]);

				expect(
					decoder.contents
				).toEqual([
					content
				]);

				expect(
					genericInstaller.install
				).toHaveBeenCalledOnce();

				expect(
					receipts.calls
				).toHaveLength(
					1
				);
			}
		);

		it(
			'dispatches different Resource Types to different handlers',
			async () => {
				const strongsHandler =
					new FakeHandler(
						'strongs/definition'
					);

				const chapterHandler =
					new FakeHandler(
						'bible/chapter'
					);

				const receipts =
					new FakeReceiptService();

				const strongs =
					createVerifiedContent();

				const chapter =
					createVerifiedContent({
						resourceType:
							'bible/chapter',

						resourceId:
							'kjvonly/bible/chapters/kjvs/1_1'
					});

				const processor =
					createProcessor({
						contents: [
							strongs,
							chapter
						],
						receipts,
						handlers: [
							strongsHandler,
							chapterHandler
						]
					});

				const result =
					await processor.process(
						createReference(),
						createRepresentation()
					);

				expect(
					result.resources.map(
						resource =>
							resource.status
					)
				).toEqual([
					'handled',
					'handled'
				]);

				expect(
					strongsHandler.resources
				).toHaveLength(
					1
				);

				expect(
					strongsHandler.resources[0]
						.resourceType
				).toBe(
					'strongs/definition'
				);

				expect(
					chapterHandler.resources
				).toHaveLength(
					1
				);

				expect(
					chapterHandler.resources[0]
						.resourceType
				).toBe(
					'bible/chapter'
				);

				expect(
					receipts.calls
				).toEqual([
					{
						publisher:
							strongs.publisher,

						resourceId:
							strongs.resourceId,

						modifiedAt:
							strongs.modifiedAt
					},
					{
						publisher:
							chapter.publisher,

						resourceId:
							chapter.resourceId,

						modifiedAt:
							chapter.modifiedAt
					}
				]);
			}
		);

		it(
			'records a handler failure and continues processing other Resources',
			async () => {
				const failure =
					new Error(
						'Strong\'s failed'
					);

				const strongsHandler =
					new FakeHandler(
						'strongs/definition',
						failure
					);

				const chapterHandler =
					new FakeHandler(
						'bible/chapter'
					);

				const receipts =
					new FakeReceiptService();

				const failed =
					createVerifiedContent();

				const handled =
					createVerifiedContent({
						resourceType:
							'bible/chapter',

						resourceId:
							'kjvonly/bible/chapters/kjvs/1_1'
					});

				const processor =
					createProcessor({
						contents: [
							failed,
							handled
						],
						receipts,
						handlers: [
							strongsHandler,
							chapterHandler
						]
					});

				const result =
					await processor.process(
						createReference(),
						createRepresentation()
					);

				expect(
					result.resources[0]
						.status
				).toBe(
					'failed'
				);

				expect(
					result.resources[1]
						.status
				).toBe(
					'handled'
				);

				expect(
					chapterHandler.resources
				).toHaveLength(
					1
				);

				expect(
					receipts.calls
				).toEqual([
					{
						publisher:
							handled.publisher,

						resourceId:
							handled.resourceId,

						modifiedAt:
							handled.modifiedAt
					}
				]);
			}
		);

		it(
			'records a decoding failure and continues processing other Resources',
			async () => {
				const bad =
					createVerifiedContent({
						resourceId:
							'kjvonly/strongs/definitions/kjvs/G1'
					});

				const good =
					createVerifiedContent({
						resourceId:
							'kjvonly/strongs/definitions/kjvs/G2'
					});

				const decoder =
					new FakeDecoder(
						bad.resourceId
					);

				const handler =
					new FakeHandler(
						'strongs/definition'
					);

				const receipts =
					new FakeReceiptService();

				const processor =
					createProcessor({
						contents: [
							bad,
							good
						],
						decoder,
						receipts,
						handlers: [
							handler
						]
					});

				const result =
					await processor.process(
						createReference(),
						createRepresentation()
					);

				expect(
					result.resources[0]
						.status
				).toBe(
					'failed'
				);

				expect(
					result.resources[1]
						.status
				).toBe(
					'handled'
				);

				expect(
					handler.resources
				).toHaveLength(
					1
				);

				expect(
					handler.resources[0]
						.resourceId
				).toBe(
					good.resourceId
				);

				expect(
					receipts.calls
				).toEqual([
					{
						publisher:
							good.publisher,

						resourceId:
							good.resourceId,

						modifiedAt:
							good.modifiedAt
					}
				]);
			}
		);

		it(
			'keeps a successfully handled Resource handled when receipt persistence fails',
			async () => {
				const receiptFailure =
					new Error(
						'Receipt persistence failed'
					);

				const receipts =
					new FakeReceiptService(
						receiptFailure
					);

				const warning =
					vi.spyOn(
						console,
						'warn'
					).mockImplementation(
						() => undefined
					);

				const content =
					createVerifiedContent();

				const processor =
					createProcessor({
						contents: [
							content
						],
						receipts
					});

				const result =
					await processor.process(
						createReference(),
						createRepresentation()
					);

				expect(
					result.resources
				).toEqual([
					{
						reference: {
							publisher:
								content.publisher,

							resourceId:
								content.resourceId
						},

						resourceType:
							content.resourceType,

						status:
							'handled'
					}
				]);

				expect(
					receipts.calls
				).toEqual([
					{
						publisher:
							content.publisher,

						resourceId:
							content.resourceId,

						modifiedAt:
							content.modifiedAt
					}
				]);

				expect(
					warning
				).toHaveBeenCalledWith(
					'[Resource receipt write failed]',
					{
						publisher:
							content.publisher,

						resourceId:
							content.resourceId,

						modifiedAt:
							content.modifiedAt,

						error:
							receiptFailure
					}
				);

				warning.mockRestore();
			}
		);



		it(
			'rejects duplicate Resource Type handlers',
			() => {
				const handlerA =
					new FakeHandler(
						'strongs/definition'
					);

				const handlerB =
					new FakeHandler(
						'strongs/definition'
					);

				expect(
					() =>
						createProcessor({
							handlers: [
								handlerA,
								handlerB
							]
						})
				).toThrow(
					'Duplicate Resource handler: strongs/definition'
				);
			}
		);
	}
);

function createProcessor(
	options: {
		readonly contents?:
			readonly VerifiedResourceContent[];

		readonly current?:
			readonly ResourceResolutionCurrent[];

		readonly failures?:
			readonly ResourceResolutionFailure[];

		readonly decoder?:
			FakeDecoder;

		readonly receipts?:
			FakeReceiptService;

		readonly genericInstaller?: {
			readonly install:
				(resource: DecodedResourceContent) => Promise<void>;
		};

		readonly handlers?:
			readonly ResourceHandler[];
	} = {}
): ResourceProcessor {
	const resolutionProcessor =
		new ResourceResolutionProcessor(
			options.decoder ??
				new FakeDecoder(),

			options.receipts ??
				new FakeReceiptService(),

			options.genericInstaller ?? {
				install:
					async () =>
						undefined
			},

			options.handlers ??
				[
					new FakeHandler(
						'strongs/definition'
					)
				]
		);

	return new ResourceProcessor(
		new FakeResolver({
			contents:
				options.contents ??
				[
					createVerifiedContent()
				],

			current:
				options.current ??
				[],

			failures:
				options.failures ??
				[]
		}),

		resolutionProcessor
	);
}

function createReference():
	PublishedResourceReference {
	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/strongs/definitions/kjvs'
	};
}

function createRepresentation(
	overrides:
		Partial<ResourceRepresentation> =
			{}
):
	ResourceRepresentation {
	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/strongs/definitions/kjvs',

		resourceType:
			'strongs/definition',

		dataType:
			'kjvonly.strongs.definition',

		dataVersion:
			1,

		eventId:
			'a'.repeat(
				64
			),

		modifiedAt:
			100,

		representation:
			'content',

		mediaType:
			'application/json',

		payload:
			'{}',

		...overrides
	};
}

function createVerifiedContent(
	overrides:
		Partial<VerifiedResourceContent> =
			{}
): VerifiedResourceContent {
	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/strongs/definitions/kjvs',

		resourceType:
			'strongs/definition',

		dataType:
			'kjvonly.strongs.definition',

		dataVersion:
			1,

		modifiedAt:
			100,

		mediaType:
			'application/json',

		content:
			'{}',

		...overrides
	};
}

class FakeResolver {

	constructor(
		private readonly result:
			ResourceResolutionResult
	) {}

	async resolve(
		_resource:
			ResourceRepresentation
	): Promise<
		ResourceResolutionResult
	> {
		return this.result;
	}
}

class FakeDecoder {

	readonly contents:
		VerifiedResourceContent[] =
			[];

	constructor(
		private readonly failingResourceId?:
			string
	) {}

	async decode(
		content:
			VerifiedResourceContent
	): Promise<DecodedResourceContent> {
		this.contents.push(
			content
		);

		if (
			content.resourceId ===
			this.failingResourceId
		) {
			throw new Error(
				'Decode failed'
			);
		}

		return {
			publisher:
				content.publisher,

			resourceId:
				content.resourceId,

			resourceType:
				content.resourceType,

			dataType:
				content.dataType,

			dataVersion:
				content.dataVersion,

			modifiedAt:
				content.modifiedAt,

			mediaType:
				content.mediaType,

			value:
				{}
		};
	}
}

class FakeReceiptService {

	readonly calls: {
		readonly publisher:
			string;

		readonly resourceId:
			string;

		readonly modifiedAt:
			number;
	}[] = [];

	constructor(
		private readonly failure?:
			Error
	) {}

	async markProcessed(
		publisher: string,
		resourceId: string,
		modifiedAt: number
	): Promise<void> {
		this.calls.push({
			publisher,
			resourceId,
			modifiedAt
		});

		if (
			this.failure !==
			undefined
		) {
			throw this.failure;
		}
	}
}

class FakeHandler
	implements ResourceHandler {

	readonly resources:
		DecodedResourceContent[] =
			[];

	constructor(
		readonly resourceType:
			string,

		private readonly failure?:
			Error
	) {}

	async handle(
		resource:
			DecodedResourceContent
	): Promise<void> {
		if (
			this.failure !==
			undefined
		) {
			throw this.failure;
		}

		this.resources.push(
			resource
		);
	}
}

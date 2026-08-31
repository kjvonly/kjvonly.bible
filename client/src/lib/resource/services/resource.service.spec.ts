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
	ResourceDiscovery
} from '$lib/resource/nostr/resource-discovery';

import type {
	ResourceHandler
} from '$lib/resource/installation/resource-handler';

import type {
	ResourceResolutionCurrent,
	ResourceResolutionFailure,
	ResourceResolutionResult
} from '$lib/resource/resolution/resource-resolution-result';

import {
	ResourceService
} from './resource.service';

describe(
	'ResourceService',
	() => {
		it(
			'returns not found when the requested Resource does not exist',
			async () => {
				const receipts =
					new FakeReceiptService();

				const service =
					createService({
						representation:
							null,

						receipts
					});

				const result =
					await service.install(
						createReference()
					);

				expect(
					result
				).toEqual({
					requested:
						createReference(),

					found:
						false,

					resources:
						[]
				});

				expect(
					receipts.calls
				).toHaveLength(
					0
				);
			}
		);

		it(
			'decodes and handles a supported Resource',
			async () => {
				const handler =
					new FakeHandler(
						'kjvonly/strongs/definitions'
					);

				const decoder =
					new FakeDecoder();

				const receipts =
					new FakeReceiptService();

				const content =
					createVerifiedContent();

				const service =
					createService({
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
					await service.install(
						createReference()
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
			'folds a Resource resolution failure into the install result',
			async () => {
				const error =
					new Error(
						'Blossom retrieval failed.'
					);

				const service =
					createService({
						contents:
							[],

						failures: [
							{
								publisher:
									'publisher',

								resourceId:
									'kjvonly/bible/chapters/kjvs',

								resourceType:
									'kjvonly/bible/chapters',

								error
							}
						]
					});

				const result =
					await service.install(
						createReference()
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
							'kjvonly/bible/chapters',

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

				const service =
					createService({
						contents:
							[],

						failures: [
							{
								error
							}
						]
					});

				const result =
					await service.install(
						createReference()
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
						'kjvonly/bible/chapters'
					);

				const current:
					ResourceResolutionCurrent = {
					publisher:
						'publisher',

					resourceId:
						'kjvonly/bible/chapters/kjvs',

					resourceType:
						'kjvonly/bible/chapters'
				};

				const service =
					createService({
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
					await service.install(
						createReference()
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

				const service =
					createService({
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
					await service.install(
						createReference()
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
			'reports an unsupported Resource Type without decoding or recording a receipt',
			async () => {
				const decoder =
					new FakeDecoder();

				const receipts =
					new FakeReceiptService();

				const content =
					createVerifiedContent({
						resourceType:
							'kjvonly/future/things',

						resourceId:
							'kjvonly/future/things/default'
					});

				const service =
					createService({
						contents: [
							content
						],
						decoder,
						receipts,
						handlers:
							[]
					});

				const result =
					await service.install(
						createReference()
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
							'unsupported'
					}
				]);

				expect(
					decoder.contents
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
			'dispatches different Resource Types to different handlers',
			async () => {
				const strongsHandler =
					new FakeHandler(
						'kjvonly/strongs/definitions'
					);

				const chapterHandler =
					new FakeHandler(
						'kjvonly/bible/chapters'
					);

				const receipts =
					new FakeReceiptService();

				const strongs =
					createVerifiedContent();

				const chapter =
					createVerifiedContent({
						resourceType:
							'kjvonly/bible/chapters',

						resourceId:
							'kjvonly/bible/chapters/kjvs/1_1'
					});

				const service =
					createService({
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
					await service.install(
						createReference()
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
					'kjvonly/strongs/definitions'
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
					'kjvonly/bible/chapters'
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
						'kjvonly/strongs/definitions',
						failure
					);

				const chapterHandler =
					new FakeHandler(
						'kjvonly/bible/chapters'
					);

				const receipts =
					new FakeReceiptService();

				const failed =
					createVerifiedContent();

				const handled =
					createVerifiedContent({
						resourceType:
							'kjvonly/bible/chapters',

						resourceId:
							'kjvonly/bible/chapters/kjvs/1_1'
					});

				const service =
					createService({
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
					await service.install(
						createReference()
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
						'kjvonly/strongs/definitions'
					);

				const receipts =
					new FakeReceiptService();

				const service =
					createService({
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
					await service.install(
						createReference()
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

				const service =
					createService({
						contents: [
							content
						],
						receipts
					});

				const result =
					await service.install(
						createReference()
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
			'deduplicates concurrent installs for the same Published Resource',
			async () => {
				const discovery =
					new DeferredDiscovery();

				const service =
					createService({
						discovery
					});

				const firstReference =
					createReference();

				const secondReference =
					createReference();

				const first =
					service.install(
						firstReference
					);

				const second =
					service.install(
						secondReference
					);

				expect(
					first
				).toBe(
					second
				);

				expect(
					discovery.references
				).toEqual([
					firstReference
				]);

				discovery.resolve(
					firstReference,
					createRepresentation()
				);

				await Promise.all([
					first,
					second
				]);

				expect(
					discovery.references
				).toHaveLength(
					1
				);
			}
		);

		it(
			'shares the successful result of a concurrent install',
			async () => {
				const discovery =
					new DeferredDiscovery();

				const receipts =
					new FakeReceiptService();

				const service =
					createService({
						discovery,
						receipts
					});

				const reference =
					createReference();

				const first =
					service.install(
						reference
					);

				const second =
					service.install({
						...reference
					});

				expect(
					first
				).toBe(
					second
				);

				discovery.resolve(
					reference,
					createRepresentation()
				);

				const firstResult =
					await first;

				const secondResult =
					await second;

				expect(
					secondResult
				).toBe(
					firstResult
				);

				expect(
					firstResult
				).toEqual({
					requested:
						reference,

					found:
						true,

					resources: [
						{
							reference: {
								publisher:
									'publisher',

								resourceId:
									'kjvonly/strongs/definitions/kjvs'
							},

							resourceType:
								'kjvonly/strongs/definitions',

							status:
								'handled'
						}
					]
				});

				expect(
					receipts.calls
				).toHaveLength(
					1
				);
			}
		);

		it(
			'shares a failed Resource result between concurrent callers',
			async () => {
				const failure =
					new Error(
						'Strong\'s failed'
					);

				const discovery =
					new DeferredDiscovery();

				const service =
					createService({
						discovery,

						handlers: [
							new FakeHandler(
								'kjvonly/strongs/definitions',
								failure
							)
						]
					});

				const reference =
					createReference();

				const first =
					service.install(
						reference
					);

				const second =
					service.install({
						...reference
					});

				expect(
					first
				).toBe(
					second
				);

				discovery.resolve(
					reference,
					createRepresentation()
				);

				const firstResult =
					await first;

				const secondResult =
					await second;

				expect(
					secondResult
				).toBe(
					firstResult
				);

				expect(
					firstResult.resources
				).toEqual([
					{
						reference: {
							publisher:
								'publisher',

							resourceId:
								'kjvonly/strongs/definitions/kjvs'
						},

						resourceType:
							'kjvonly/strongs/definitions',

						status:
							'failed',

						error:
							failure
					}
				]);

				expect(
					discovery.references
				).toHaveLength(
					1
				);
			}
		);

		it(
			'clears a rejected in-flight install so a later request can try again',
			async () => {
				const discovery =
					new DeferredDiscovery();

				const service =
					createService({
						discovery
					});

				const reference =
					createReference();

				const failure =
					new Error(
						'Discovery failed.'
					);

				const first =
					service.install(
						reference
					);

				const concurrent =
					service.install({
						...reference
					});

				expect(
					concurrent
				).toBe(
					first
				);

				const firstRejection =
					expect(
						first
					).rejects.toBe(
						failure
					);

				const concurrentRejection =
					expect(
						concurrent
					).rejects.toBe(
						failure
					);

				discovery.reject(
					reference,
					failure
				);

				await firstRejection;
				await concurrentRejection;

				const retry =
					service.install(
						reference
					);

				expect(
					retry
				).not.toBe(
					first
				);

				expect(
					discovery.references
				).toEqual([
					reference,
					reference
				]);

				discovery.resolve(
					reference,
					createRepresentation()
				);

				await expect(
					retry
				).resolves.toMatchObject({
					requested:
						reference,

					found:
						true
				});
			}
		);

		it(
			'does not deduplicate different Published Resources',
			async () => {
				const discovery =
					new DeferredDiscovery();

				const service =
					createService({
						discovery,

						contents:
							[]
					});

				const firstReference =
					createReference();

				const secondReference:
					PublishedResourceReference = {
					publisher:
						firstReference.publisher,

					resourceId:
						'kjvonly/strongs/definitions/kjvs/H7225'
				};

				const first =
					service.install(
						firstReference
					);

				const second =
					service.install(
						secondReference
					);

				expect(
					first
				).not.toBe(
					second
				);

				expect(
					discovery.references
				).toEqual([
					firstReference,
					secondReference
				]);

				let firstSettled =
					false;

				void first.then(
					() => {
						firstSettled =
							true;
					},

					() => {
						firstSettled =
							true;
					}
				);

				discovery.resolve(
					secondReference,
					createRepresentation({
						resourceId:
							secondReference.resourceId
					})
				);

				await expect(
					second
				).resolves.toMatchObject({
					requested:
						secondReference,

					found:
						true
				});

				expect(
					firstSettled
				).toBe(
					false
				);

				discovery.resolve(
					firstReference,
					createRepresentation()
				);

				await expect(
					first
				).resolves.toMatchObject({
					requested:
						firstReference,

					found:
						true
				});
			}
		);

		it(
			'rejects duplicate Resource Type handlers',
			() => {
				const handlerA =
					new FakeHandler(
						'kjvonly/strongs/definitions'
					);

				const handlerB =
					new FakeHandler(
						'kjvonly/strongs/definitions'
					);

				expect(
					() =>
						createService({
							handlers: [
								handlerA,
								handlerB
							]
						})
				).toThrow(
					'Duplicate Resource handler: kjvonly/strongs/definitions'
				);
			}
		);
	}
);

function createService(
	options: {
		readonly representation?:
			ResourceRepresentation |
			null;

		readonly discovery?:
			Pick<
				ResourceDiscovery,
				'get'
			>;

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

		readonly handlers?:
			readonly ResourceHandler[];
	} = {}
): ResourceService {
	return new ResourceService(
		options.discovery ??
			new FakeDiscovery(
				options.representation ===
					undefined
					? createRepresentation()
					: options.representation
			),

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

		options.decoder ??
			new FakeDecoder(),

		options.receipts ??
			new FakeReceiptService(),

		options.handlers ??
			[
				new FakeHandler(
					'kjvonly/strongs/definitions'
				)
			]
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
			'kjvonly/strongs/definitions',

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
			'kjvonly/strongs/definitions',

		modifiedAt:
			100,

		mediaType:
			'application/json',

		content:
			'{}',

		...overrides
	};
}

class FakeDiscovery {

	readonly references:
		PublishedResourceReference[] =
			[];

	constructor(
		private readonly representation:
			ResourceRepresentation |
			null
	) {}

	async get(
		reference:
			PublishedResourceReference
	): Promise<
		ResourceRepresentation |
		null
	> {

		this.references.push(
			reference
		);

		return this.representation;
	}
}

interface PendingDiscovery {
	readonly resolve:
		(
			representation:
				ResourceRepresentation |
				null
		) => void;

	readonly reject:
		(
			error:
				unknown
		) => void;
}

class DeferredDiscovery {

	readonly references:
		PublishedResourceReference[] =
			[];

	private readonly pending =
		new Map<
			string,
			PendingDiscovery[]
		>();

	get(
		reference:
			PublishedResourceReference
	): Promise<
		ResourceRepresentation |
		null
	> {

		this.references.push(
			reference
		);

		return new Promise(
			(
				resolve,
				reject
			) => {

				const key =
					this.createKey(
						reference
					);

				const pending =
					this.pending.get(
						key
					) ??
						[];

				pending.push({
					resolve,
					reject
				});

				this.pending.set(
					key,
					pending
				);
			}
		);
	}

	resolve(
		reference:
			PublishedResourceReference,

		representation:
			ResourceRepresentation |
			null
	): void {

		this.take(
			reference
		).resolve(
			representation
		);
	}

	reject(
		reference:
			PublishedResourceReference,

		error:
			unknown
	): void {

		this.take(
			reference
		).reject(
			error
		);
	}

	private take(
		reference:
			PublishedResourceReference
	): PendingDiscovery {

		const key =
			this.createKey(
				reference
			);

		const pending =
			this.pending.get(
				key
			);

		if (
			pending ===
			undefined ||
			pending.length ===
			0
		) {
			throw new Error(
				'No pending discovery request.'
			);
		}

		const next =
			pending.shift();

		if (
			pending.length ===
			0
		) {
			this.pending.delete(
				key
			);
		}

		if (
			next ===
			undefined
		) {
			throw new Error(
				'No pending discovery request.'
			);
		}

		return next;
	}

	private createKey(
		reference:
			PublishedResourceReference
	): string {

		return JSON.stringify([
			reference.publisher,
			reference.resourceId
		]);
	}
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
import {
	describe,
	expect,
	it
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

import {
	ResourceService
} from './resource.service';

describe(
	'ResourceService',
	() => {
		it(
			'returns not found when the requested Resource does not exist',
			async () => {
				const service =
					createService({
						representation:
							null
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

				const content =
					createVerifiedContent();

				const service =
					createService({
						contents: [
							content
						],
						decoder,
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
			}
		);

		it(
			'reports an unsupported Resource Type without decoding it',
			async () => {
				const decoder =
					new FakeDecoder();

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

				const service =
					createService({
						contents: [
							createVerifiedContent(),
							createVerifiedContent({
								resourceType:
									'kjvonly/bible/chapters',

								resourceId:
									'kjvonly/bible/chapters/kjvs/1_1'
							})
						],
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

				const service =
					createService({
						contents: [
							bad,
							good
						],
						decoder,
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

		readonly contents?:
			readonly VerifiedResourceContent[];

		readonly decoder?:
			FakeDecoder;

		readonly handlers?:
			readonly ResourceHandler[];
	} = {}
): ResourceService {
	return new ResourceService(
		new FakeDiscovery(
			options.representation ===
				undefined
				? createRepresentation()
				: options.representation
		),

		new FakeResolver(
			options.contents ??
				[
					createVerifiedContent()
				]
		),

		options.decoder ??
			new FakeDecoder(),

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

function createRepresentation():
	ResourceRepresentation {
	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/strongs/definitions/kjvs',

		resourceType:
			'kjvonly/strongs/definitions',

		eventId:
			'a'.repeat(64),

		modifiedAt:
			100,

		representation:
			'content',

		mediaType:
			'application/json',

		payload:
			'{}'
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

		eventId:
			'b'.repeat(64),

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

	constructor(
		private readonly representation:
			ResourceRepresentation |
			null
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
		readonly VerifiedResourceContent[]
	> {
		return this.contents;
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

			eventId:
				content.eventId,

			modifiedAt:
				content.modifiedAt,

			mediaType:
				content.mediaType,

			value:
				{}
		};
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
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

import {
	StrongsResourceService
} from './strongs-resource-service';

describe(
	'StrongsResourceService',
	() => {
		it(
			'returns false when the Resource is not discovered',
			async () => {
				const discovery =
					new FakeDiscovery(
						null
					);

				const resolver =
					new FakeResolver();

				const decoder =
					new FakeDecoder();

				const handler =
					new FakeHandler();

				const service =
					new StrongsResourceService(
						discovery,
						resolver,
						decoder,
						handler
					);

				const result =
					await service.install(
						createReference()
					);

				expect(
					result
				).toBe(
					false
				);

				expect(
					resolver.resolveCount
				).toBe(
					0
				);

				expect(
					decoder.decodeCount
				).toBe(
					0
				);

				expect(
					handler.handleCount
				).toBe(
					0
				);
			}
		);

		it(
			'discovers resolves decodes and handles a Resource',
			async () => {
				const representation =
					createRepresentation();

				const content =
					createVerifiedContent();

				const decoded =
					createDecodedContent();

				const discovery =
					new FakeDiscovery(
						representation
					);

				const resolver =
					new FakeResolver([
						content
					]);

				const decoder =
					new FakeDecoder(
						new Map([
							[
								content,
								decoded
							]
						])
					);

				const handler =
					new FakeHandler();

				const service =
					new StrongsResourceService(
						discovery,
						resolver,
						decoder,
						handler
					);

				const reference =
					createReference();

				const result =
					await service.install(
						reference
					);

				expect(
					result
				).toBe(
					true
				);

				expect(
					discovery.reference
				).toBe(
					reference
				);

				expect(
					resolver.resource
				).toBe(
					representation
				);

				expect(
					decoder.resources
				).toEqual([
					content
				]);

				expect(
					handler.resources
				).toEqual([
					decoded
				]);
			}
		);

		it(
			'processes every resolved Resource content',
			async () => {
				const contentA =
					createVerifiedContent({
						eventId:
							'event-a'
					});

				const contentB =
					createVerifiedContent({
						eventId:
							'event-b'
					});

				const decodedA =
					createDecodedContent({
						eventId:
							'event-a'
					});

				const decodedB =
					createDecodedContent({
						eventId:
							'event-b'
					});

				const discovery =
					new FakeDiscovery(
						createRepresentation()
					);

				const resolver =
					new FakeResolver([
						contentA,
						contentB
					]);

				const decoder =
					new FakeDecoder(
						new Map([
							[
								contentA,
								decodedA
							],
							[
								contentB,
								decodedB
							]
						])
					);

				const handler =
					new FakeHandler();

				const service =
					new StrongsResourceService(
						discovery,
						resolver,
						decoder,
						handler
					);

				const result =
					await service.install(
						createReference()
					);

				expect(
					result
				).toBe(
					true
				);

				expect(
					decoder.resources
				).toEqual([
					contentA,
					contentB
				]);

				expect(
					handler.resources
				).toEqual([
					decodedA,
					decodedB
				]);
			}
		);

		it(
			'processes resolved Resource contents sequentially',
			async () => {
				const operations:
					string[] =
						[];

				const contentA =
					createVerifiedContent({
						eventId:
							'event-a'
					});

				const contentB =
					createVerifiedContent({
						eventId:
							'event-b'
					});

				const decodedA =
					createDecodedContent({
						eventId:
							'event-a'
					});

				const decodedB =
					createDecodedContent({
						eventId:
							'event-b'
					});

				const discovery =
					new FakeDiscovery(
						createRepresentation()
					);

				const resolver =
					new FakeResolver([
						contentA,
						contentB
					]);

				const decoder = {
					decode:
						async (
							content:
								VerifiedResourceContent
						): Promise<
							DecodedResourceContent
						> => {

							operations.push(
								`decode:${content.eventId}`
							);

							if (
								content ===
								contentA
							) {
								return decodedA;
							}

							return decodedB;
						}
				};

				const handler = {
					handle:
						async (
							resource:
								DecodedResourceContent
						): Promise<void> => {

							operations.push(
								`handle:${resource.eventId}`
							);
						}
				};

				const service =
					new StrongsResourceService(
						discovery,
						resolver,
						decoder,
						handler
					);

				await service.install(
					createReference()
				);

				expect(
					operations
				).toEqual([
					'decode:event-a',
					'handle:event-a',
					'decode:event-b',
					'handle:event-b'
				]);
			}
		);

		it(
			'propagates content decoding failures',
			async () => {
				const content =
					createVerifiedContent();

				const discovery =
					new FakeDiscovery(
						createRepresentation()
					);

				const resolver =
					new FakeResolver([
						content
					]);

				const decoder = {
					decode:
						async () => {
							throw new Error(
								'decoding failed'
							);
						}
				};

				const handler =
					new FakeHandler();

				const service =
					new StrongsResourceService(
						discovery,
						resolver,
						decoder,
						handler
					);

				await expect(
					service.install(
						createReference()
					)
				).rejects.toThrow(
					'decoding failed'
				);

				expect(
					handler.handleCount
				).toBe(
					0
				);
			}
		);

		it(
			'propagates handler failures',
			async () => {
				const content =
					createVerifiedContent();

				const decoded =
					createDecodedContent();

				const discovery =
					new FakeDiscovery(
						createRepresentation()
					);

				const resolver =
					new FakeResolver([
						content
					]);

				const decoder =
					new FakeDecoder(
						new Map([
							[
								content,
								decoded
							]
						])
					);

				const handler =
					new FakeHandler(
						new Error(
							'handling failed'
						)
					);

				const service =
					new StrongsResourceService(
						discovery,
						resolver,
						decoder,
						handler
					);

				await expect(
					service.install(
						createReference()
					)
				).rejects.toThrow(
					'handling failed'
				);
			}
		);

		it(
			'stops processing resolved contents after a handler failure',
			async () => {
				const contentA =
					createVerifiedContent({
						eventId:
							'event-a'
					});

				const contentB =
					createVerifiedContent({
						eventId:
							'event-b'
					});

				const decodedA =
					createDecodedContent({
						eventId:
							'event-a'
					});

				const decodedB =
					createDecodedContent({
						eventId:
							'event-b'
					});

				const discovery =
					new FakeDiscovery(
						createRepresentation()
					);

				const resolver =
					new FakeResolver([
						contentA,
						contentB
					]);

				const decoder =
					new FakeDecoder(
						new Map([
							[
								contentA,
								decodedA
							],
							[
								contentB,
								decodedB
							]
						])
					);

				const handler = {
					handle:
						async (
							resource:
								DecodedResourceContent
						): Promise<void> => {

							if (
								resource ===
								decodedA
							) {
								throw new Error(
									'handling failed'
								);
							}
						}
				};

				const service =
					new StrongsResourceService(
						discovery,
						resolver,
						decoder,
						handler
					);

				await expect(
					service.install(
						createReference()
					)
				).rejects.toThrow(
					'handling failed'
				);

				expect(
					decoder.resources
				).toEqual([
					contentA
				]);
			}
		);
	}
);

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
): ResourceRepresentation {

	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/strongs/definitions/kjvs',

		resourceType:
			'kjvonly/strongs/definitions',

		eventId:
			'event-id',

		modifiedAt:
			200,

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

		eventId:
			'event-id',

		modifiedAt:
			200,

		mediaType:
			'application/json',

		content:
			'{}',

		...overrides
	};
}

function createDecodedContent(
	overrides:
		Partial<DecodedResourceContent> =
			{}
): DecodedResourceContent {

	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/strongs/definitions/kjvs',

		resourceType:
			'kjvonly/strongs/definitions',

		eventId:
			'event-id',

		modifiedAt:
			200,

		mediaType:
			'application/json',

		value:
			{},

		...overrides
	};
}

class FakeDiscovery {

	reference:
		PublishedResourceReference |
		undefined;

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

		this.reference =
			reference;

		return this.representation;
	}
}

class FakeResolver {

	resolveCount =
		0;

	resource:
		ResourceRepresentation |
		undefined;

	constructor(
		private readonly contents:
			readonly VerifiedResourceContent[] =
				[]
	) {}

	async resolve(
		resource:
			ResourceRepresentation
	): Promise<
		readonly VerifiedResourceContent[]
	> {

		this.resolveCount++;

		this.resource =
			resource;

		return this.contents;
	}
}

class FakeDecoder {

	decodeCount =
		0;

	readonly resources:
		VerifiedResourceContent[] =
			[];

	constructor(
		private readonly results:
			ReadonlyMap<
				VerifiedResourceContent,
				DecodedResourceContent
			> =
				new Map()
	) {}

	async decode(
		resource:
			VerifiedResourceContent
	): Promise<
		DecodedResourceContent
	> {

		this.decodeCount++;

		this.resources.push(
			resource
		);

		const result =
			this.results.get(
				resource
			);

		if (!result) {
			return createDecodedContent({
				publisher:
					resource.publisher,

				resourceId:
					resource.resourceId,

				resourceType:
					resource.resourceType,

				eventId:
					resource.eventId,

				modifiedAt:
					resource.modifiedAt,

				mediaType:
					resource.mediaType
			});
		}

		return result;
	}
}

class FakeHandler {

	handleCount =
		0;

	readonly resources:
		DecodedResourceContent[] =
			[];

	constructor(
		private readonly error?:
			Error
	) {}

	async handle(
		resource:
			DecodedResourceContent
	): Promise<void> {

		this.handleCount++;

		this.resources.push(
			resource
		);

		if (this.error) {
			throw this.error;
		}
	}
}
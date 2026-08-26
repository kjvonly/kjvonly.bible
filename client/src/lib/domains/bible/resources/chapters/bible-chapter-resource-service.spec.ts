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
	BibleChapterResourceService
} from './bible-chapter-resource-service';

describe(
	'BibleChapterResourceService',
	() => {
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
								content.eventId,
								decoded
							]
						])
					);

				const handler =
					new FakeHandler();

				const service =
					new BibleChapterResourceService(
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
					discovery.references
				).toEqual([
					reference
				]);

				expect(
					resolver.resources
				).toEqual([
					representation
				]);

				expect(
					decoder.contents
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
			'returns false when the Resource is not discovered',
			async () => {
				const discovery =
					new FakeDiscovery(
						null
					);

				const resolver =
					new FakeResolver(
						[]
					);

				const decoder =
					new FakeDecoder();

				const handler =
					new FakeHandler();

				const service =
					new BibleChapterResourceService(
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
					resolver.resources
				).toHaveLength(
					0
				);

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
			}
		);

		it(
			'processes each resolved content independently',
			async () => {
				const contentA =
					createVerifiedContent({
						eventId:
							'event-a',

						resourceId:
							'kjvonly/bible/chapters/kjvs/1_1'
					});

				const contentB =
					createVerifiedContent({
						eventId:
							'event-b',

						resourceId:
							'kjvonly/bible/chapters/kjvs/1_2'
					});

				const decodedA =
					createDecodedContent({
						eventId:
							'event-a',

						resourceId:
							'kjvonly/bible/chapters/kjvs/1_1'
					});

				const decodedB =
					createDecodedContent({
						eventId:
							'event-b',

						resourceId:
							'kjvonly/bible/chapters/kjvs/1_2'
					});

				const decoder =
					new FakeDecoder(
						new Map([
							[
								'event-a',
								decodedA
							],
							[
								'event-b',
								decodedB
							]
						])
					);

				const handler =
					new FakeHandler();

				const service =
					new BibleChapterResourceService(
						new FakeDiscovery(
							createRepresentation()
						),
						new FakeResolver([
							contentA,
							contentB
						]),
						decoder,
						handler
					);

				await service.install(
					createReference()
				);

				expect(
					decoder.contents
						.map(
							(content) =>
								content.eventId
						)
				).toEqual([
					'event-a',
					'event-b'
				]);

				expect(
					handler.resources
						.map(
							(resource) =>
								resource.eventId
						)
				).toEqual([
					'event-a',
					'event-b'
				]);
			}
		);

		it(
			'completes handling one resolved content before processing the next',
			async () => {
				const calls:
					string[] = [];

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

				const decoder =
					new FakeDecoder(
						new Map([
							[
								'event-a',
								decodedA
							],
							[
								'event-b',
								decodedB
							]
						]),
						calls
					);

				const handler =
					new FakeHandler(
						calls
					);

				const service =
					new BibleChapterResourceService(
						new FakeDiscovery(
							createRepresentation()
						),
						new FakeResolver([
							contentA,
							contentB
						]),
						decoder,
						handler
					);

				await service.install(
					createReference()
				);

				expect(
					calls
				).toEqual([
					'decode:event-a',
					'handle:event-a',
					'decode:event-b',
					'handle:event-b'
				]);
			}
		);

		it(
			'does not treat multiple resolved contents as one installation unit',
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

				const decoder =
					new FakeDecoder(
						new Map([
							[
								'event-a',
								decodedA
							],
							[
								'event-b',
								decodedB
							]
						])
					);

				const handler =
					new FakeHandler(
						undefined,
						'event-b'
					);

				const service =
					new BibleChapterResourceService(
						new FakeDiscovery(
							createRepresentation()
						),
						new FakeResolver([
							contentA,
							contentB
						]),
						decoder,
						handler
					);

				await expect(
					service.install(
						createReference()
					)
				).rejects.toThrow(
					'handler failed'
				);

				expect(
					handler.resources
						.map(
							(resource) =>
								resource.eventId
						)
				).toEqual([
					'event-a',
					'event-b'
				]);
			}
		);

		it(
			'does not handle content when decoding fails',
			async () => {
				const content =
					createVerifiedContent();

				const decoder =
					new ThrowingDecoder();

				const handler =
					new FakeHandler();

				const service =
					new BibleChapterResourceService(
						new FakeDiscovery(
							createRepresentation()
						),
						new FakeResolver([
							content
						]),
						decoder,
						handler
					);

				await expect(
					service.install(
						createReference()
					)
				).rejects.toThrow(
					'decode failed'
				);

				expect(
					handler.resources
				).toHaveLength(
					0
				);
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
			'kjvonly/bible/chapters/kjvs'
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
			'kjvonly/bible/chapters/kjvs',

		resourceType:
			'kjvonly/bible/chapters',

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
			'kjvonly/bible/chapters/kjvs',

		resourceType:
			'kjvonly/bible/chapters',

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
			'kjvonly/bible/chapters/kjvs',

		resourceType:
			'kjvonly/bible/chapters',

		eventId:
			'event-id',

		modifiedAt:
			200,

		mediaType:
			'application/json',

		value: {},

		...overrides
	};
}

class FakeDiscovery {

	readonly references:
		PublishedResourceReference[] =
			[];

	constructor(
		private readonly result:
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

		return this.result;
	}
}

class FakeResolver {

	readonly resources:
		ResourceRepresentation[] =
			[];

	constructor(
		private readonly result:
			readonly VerifiedResourceContent[]
	) {}

	async resolve(
		resource:
			ResourceRepresentation
	): Promise<
		readonly VerifiedResourceContent[]
	> {
		this.resources.push(
			resource
		);

		return this.result;
	}
}

class FakeDecoder {

	readonly contents:
		VerifiedResourceContent[] =
			[];

	constructor(
		private readonly results =
			new Map<
				string,
				DecodedResourceContent
			>(),

		private readonly calls?:
			string[]
	) {}

	async decode(
		content:
			VerifiedResourceContent
	): Promise<
		DecodedResourceContent
	> {
		this.contents.push(
			content
		);

		this.calls?.push(
			`decode:${content.eventId}`
		);

		const result =
			this.results.get(
				content.eventId
			);

		if (!result) {
			return createDecodedContent({
				eventId:
					content.eventId,

				resourceId:
					content.resourceId
			});
		}

		return result;
	}
}

class ThrowingDecoder {

	async decode(
		_content:
			VerifiedResourceContent
	): Promise<
		DecodedResourceContent
	> {
		throw new Error(
			'decode failed'
		);
	}
}

class FakeHandler {

	readonly resources:
		DecodedResourceContent[] =
			[];

	constructor(
		private readonly calls?:
			string[],

		private readonly failingEventId?:
			string
	) {}

	async handle(
		resource:
			DecodedResourceContent
	): Promise<void> {
		this.resources.push(
			resource
		);

		this.calls?.push(
			`handle:${resource.eventId}`
		);

		if (
			resource.eventId ===
			this.failingEventId
		) {
			throw new Error(
				'handler failed'
			);
		}
	}
}
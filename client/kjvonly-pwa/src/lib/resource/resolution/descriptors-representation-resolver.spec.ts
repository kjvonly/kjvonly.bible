import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import {
	ResourceDescriptorValidator
} from '$lib/resource/descriptors/resource-descriptor-validator';

import type {
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import {
	DescriptorsRepresentationResolver
} from './descriptors-representation-resolver';

import type {
	ResourceResolutionStrategy
} from './resource-resolution-strategy';

const PUBLISHER =
	'a'.repeat(
		64
	);

const SECOND_PUBLISHER =
	'b'.repeat(
		64
	);

describe(
	'DescriptorsRepresentationResolver',
	() => {

		it(
			'uses the descriptors representation type',
			() => {
				const {
					resolver
				} = createResolver();

				expect(
					resolver.representation
				).toBe(
					'descriptors'
				);
			}
		);

		it(
			'rejects duplicate Resource resolution strategies',
			() => {
				const strategyA =
					createStrategy(
						'blossom'
					);

				const strategyB =
					createStrategy(
						'blossom'
					);

				expect(
					() =>
						createResolver({
							strategies: [
								strategyA,
								strategyB
							]
						})
				).toThrow(
					'Duplicate Resource resolution strategy: blossom'
				);
			}
		);

		it(
			'decodes the containing descriptor document and resolves child Resource content',
			async () => {
				const descriptor =
					createDescriptor();

				const content =
					new Uint8Array([
						1,
						2,
						3
					]);

				const strategy =
					createStrategy(
						'blossom',
						content
					);

				const {
					resolver,
					documentDecoder,
					receiptService
				} = createResolver({
					entries: [
						descriptor
					],
					strategies: [
						strategy
					]
				});

				const resource =
					createResourceRepresentation();

				const result =
					await resolver.resolve(
						resource
					);

				expect(
					documentDecoder.decode
				).toHaveBeenCalledWith(
					resource.mediaType,
					resource.payload
				);

				expect(
					receiptService.needsProcessing
				).toHaveBeenCalledWith(
					PUBLISHER,
					'kjvonly/bible/chapters/kjvs',
					100
				);

				expect(
					strategy.resolve
				).toHaveBeenCalledWith(
					descriptor
				);

				expect(
					result
				).toEqual({
					contents: [
						{
							publisher:
								PUBLISHER,

							resourceId:
								'kjvonly/bible/chapters/kjvs',

							resourceType:
								'kjvonly/bible/chapters',

							modifiedAt:
								100,

							mediaType:
								'application/json+gzip',

							content
						}
					],

					current:
						[],

					failures:
						[]
				});
			}
		);

		it(
			'preserves a child Resource when its receipt is current',
			async () => {
				const strategy =
					createStrategy(
						'blossom'
					);

				const {
					resolver,
					receiptService
				} = createResolver({
					entries: [
						createDescriptor()
					],
					needsProcessing:
						false,
					strategies: [
						strategy
					]
				});

				const result =
					await resolver.resolve(
						createResourceRepresentation()
					);

				expect(
					receiptService.needsProcessing
				).toHaveBeenCalledOnce();

				expect(
					strategy.resolve
				).not.toHaveBeenCalled();

				expect(
					result
				).toEqual({
					contents:
						[],

					current: [
						{
							publisher:
								PUBLISHER,

							resourceId:
								'kjvonly/bible/chapters/kjvs',

							resourceType:
								'kjvonly/bible/chapters'
						}
					],

					failures:
						[]
				});
			}
		);

		it(
			'returns a failure for an unsupported strategy and continues resolving later descriptors',
			async () => {
				const content =
					new Uint8Array([
						1
					]);

				const blossom =
					createStrategy(
						'blossom',
						content
					);

				const unsupported =
					createDescriptor({
						strategy: {
							type:
								'ipfs',

							data:
								{}
						}
					});

				const supported =
					createDescriptor({
						metadata: {
							publisher:
								SECOND_PUBLISHER,

							resourceId:
								'kjvonly/strongs/definitions/kjvs',

							category:
								'kjvonly/strongs/definitions',

							modifiedAt:
								200,

							mediaType:
								'application/json+gzip'
						}
					});

				const {
					resolver
				} = createResolver({
					entries: [
						unsupported,
						supported
					],
					strategies: [
						blossom
					]
				});

				const result =
					await resolver.resolve(
						createResourceRepresentation()
					);

				expect(
					result.contents
				).toEqual([
					{
						publisher:
							SECOND_PUBLISHER,

						resourceId:
							'kjvonly/strongs/definitions/kjvs',

						resourceType:
							'kjvonly/strongs/definitions',

						modifiedAt:
							200,

						mediaType:
							'application/json+gzip',

						content
					}
				]);

				expect(
					result.failures
				).toHaveLength(
					1
				);

				expect(
					result.failures[0]
				).toMatchObject({
					publisher:
						PUBLISHER,

					resourceId:
						'kjvonly/bible/chapters/kjvs',

					resourceType:
						'kjvonly/bible/chapters'
				});

				expect(
					result.failures[0]
						.error
				).toEqual(
					expect.objectContaining({
						message:
							'Unsupported Resource resolution strategy: ipfs'
					})
				);

				expect(
					blossom.resolve
				).toHaveBeenCalledWith(
					supported
				);
			}
		);

		it(
			'returns an identity-less failure for an invalid descriptor and continues resolving later descriptors',
			async () => {
				const content =
					new Uint8Array([
						1
					]);

				const blossom =
					createStrategy(
						'blossom',
						content
					);

				const valid =
					createDescriptor();

				const {
					resolver
				} = createResolver({
					entries: [
						null,
						valid
					],
					strategies: [
						blossom
					]
				});

				const result =
					await resolver.resolve(
						createResourceRepresentation()
					);

				expect(
					result.contents
				).toHaveLength(
					1
				);

				expect(
					result.failures
				).toHaveLength(
					1
				);

				expect(
					result.failures[0]
				).toEqual({
					error:
						expect.objectContaining({
							message:
								'Invalid Resource descriptor.'
						})
				});

				expect(
					blossom.resolve
				).toHaveBeenCalledWith(
					valid
				);
			}
		);

		it(
			'returns a child failure when strategy resolution fails and continues resolving later descriptors',
			async () => {
				const failedDescriptor =
					createDescriptor();

				const successfulDescriptor =
					createDescriptor({
						metadata: {
							publisher:
								SECOND_PUBLISHER,

							resourceId:
								'kjvonly/strongs/definitions/kjvs',

							category:
								'kjvonly/strongs/definitions',

							modifiedAt:
								200,

							mediaType:
								'application/json+gzip'
						}
					});

				const strategy:
					ResourceResolutionStrategy = {
						type:
							'blossom',

						resolve:
							vi.fn(
								async (
									descriptor
								) => {
									if (
										descriptor.metadata
											.resourceId ===
										failedDescriptor.metadata
											.resourceId
									) {
										throw new Error(
											'retrieval failed'
										);
									}

									return new Uint8Array([
										1
									]);
								}
							)
					};

				const {
					resolver
				} = createResolver({
					entries: [
						failedDescriptor,
						successfulDescriptor
					],
					strategies: [
						strategy
					]
				});

				const result =
					await resolver.resolve(
						createResourceRepresentation()
					);

				expect(
					result.contents
				).toHaveLength(
					1
				);

				expect(
					result.failures
				).toHaveLength(
					1
				);

				expect(
					result.failures[0]
				).toMatchObject({
					publisher:
						PUBLISHER,

					resourceId:
						'kjvonly/bible/chapters/kjvs',

					resourceType:
						'kjvonly/bible/chapters'
				});

				expect(
					result.failures[0]
						.error
				).toEqual(
					expect.objectContaining({
						message:
							'retrieval failed'
					})
				);

				expect(
					strategy.resolve
				).toHaveBeenCalledTimes(
					2
				);
			}
		);

		it(
			'returns a failure for the containing Resource when the descriptor document cannot be decoded',
			async () => {
				const error =
					new Error(
						'invalid descriptor document'
					);

				const documentDecoder = {
					decode:
						vi.fn(
							async () => {
								throw error;
							}
						)
				};

				const receiptService = {
					needsProcessing:
						vi.fn(
							async () =>
								true
						)
				};

				const resolver =
					new DescriptorsRepresentationResolver(
						documentDecoder,
						new ResourceDescriptorValidator(),
						receiptService,
						[
							createStrategy(
								'blossom'
							)
						]
					);

				const resource =
					createResourceRepresentation();

				const result =
					await resolver.resolve(
						resource
					);

				expect(
					result
				).toEqual({
					contents:
						[],

					current:
						[],

					failures: [
						{
							publisher:
								resource.publisher,

							resourceId:
								resource.resourceId,

							resourceType:
								resource.resourceType,

							error
						}
					]
				});

				expect(
					receiptService.needsProcessing
				).not.toHaveBeenCalled();
			}
		);
	}
);

function createResolver(
	options: {
		readonly entries?:
			readonly unknown[];

		readonly needsProcessing?:
			boolean;

		readonly strategies?:
			readonly ResourceResolutionStrategy[];
	} =
		{}
) {
	const documentDecoder = {
		decode:
			vi.fn(
				async () =>
					options.entries ??
					[]
			)
	};

	const receiptService = {
		needsProcessing:
			vi.fn(
				async () =>
					options.needsProcessing ??
					true
			)
	};

	const resolver =
		new DescriptorsRepresentationResolver(
			documentDecoder,
			new ResourceDescriptorValidator(),
			receiptService,
			options.strategies ??
			[]
		);

	return {
		resolver,
		documentDecoder,
		receiptService
	};
}

function createStrategy(
	type: string,
	content:
		Uint8Array =
			new Uint8Array([
				1
			])
): ResourceResolutionStrategy {
	return {
		type,

		resolve:
			vi.fn(
				async () =>
					content
			)
	};
}

function createDescriptor(
	overrides: {
		readonly metadata?:
			ResourceDescriptor['metadata'];

		readonly strategy?:
			ResourceDescriptor['strategy'];
	} =
		{}
): ResourceDescriptor {
	return {
		metadata:
			overrides.metadata ??
			{
				publisher:
					PUBLISHER,

				resourceId:
					'kjvonly/bible/chapters/kjvs',

				category:
					'kjvonly/bible/chapters',

				modifiedAt:
					100,

				mediaType:
					'application/json+gzip'
			},

		strategy:
			overrides.strategy ??
			{
				type:
					'blossom',

				data:
					{}
			}
	};
}

function createResourceRepresentation():
	ResourceRepresentation {
	return {
		publisher:
			'c'.repeat(
				64
			),

		resourceId:
			'kjvonly/resources/collections/default',

		resourceType:
			'kjvonly/resources/collections',

		eventId:
			'd'.repeat(
				64
			),

		modifiedAt:
			300,

		representation:
			'descriptors',

		mediaType:
			'application/json',

		payload:
			'[]'
	};
}
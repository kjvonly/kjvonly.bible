import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import {
	ResourceDescriptorGraphResolver
} from './resource-descriptor-graph-resolver';


const PUBLISHER =
	'a'.repeat(
		64
	);

const ROOT_RESOURCE_ID =
	'kjvonly/resources/collections/default';


/**
 * Creates a valid descriptor fixture for graph-resolution tests.
 */
function createDescriptor(
	overrides: {
		readonly resourceId?:
			string;

		readonly representation?:
			'content' |
			'descriptors';

		readonly category?:
			string;
	} =
		{}
): ResourceDescriptor {
	return {
		metadata: {
			publisher:
				PUBLISHER,

			resourceId:
				overrides.resourceId ??
				'kjvonly/bible/chapters/kjvs',

			category:
				overrides.category ??
				'kjvonly/bible/chapters',

			modifiedAt:
				100,

			representation:
				overrides.representation ??
				'content',

			mediaType:
				'application/json+gzip'
		},

		strategy: {
			type:
				'blossom',

			data:
				{}
		}
	};
}


/**
 * Creates the terminal verified-content fixture expected from a descriptor.
 */
function createVerifiedContent(
	descriptor:
		ResourceDescriptor,

	content:
		Uint8Array
): VerifiedResourceContent {
	return {
		publisher:
			descriptor.metadata.publisher,

		resourceId:
			descriptor.metadata.resourceId,

		resourceType:
			descriptor.metadata.category,

		modifiedAt:
			descriptor.metadata.modifiedAt,

		mediaType:
			descriptor.metadata.mediaType,

		content
	};
}


describe(
	'ResourceDescriptorGraphResolver',
	() => {
		it(
			'resolves a ready terminal descriptor through the terminal resolver',
			async () => {
				const descriptor =
					createDescriptor();

				const verified =
					createVerifiedContent(
						descriptor,
						new Uint8Array([
							1,
							2
						])
					);

				const descriptorTerminalResolver = {
					resolve:
						vi.fn(
							async () =>
								verified
						)
				};

				const resolver =
					new ResourceDescriptorGraphResolver(
						{
							decode:
								vi.fn()
						},
						{
							prepare:
								vi.fn(
									async () => ({
										status:
											'ready' as const,

										descriptor
									})
							)
						},
						{
							resolve:
								vi.fn()
						},
						descriptorTerminalResolver
					);

				const result =
					await resolver.resolve(
						[
							{}
						],
						{
							publisher:
								PUBLISHER,

							resourceId:
								ROOT_RESOURCE_ID
						}
					);

				expect(
					descriptorTerminalResolver.resolve
				).toHaveBeenCalledWith(
					descriptor
				);

				expect(
					result
				).toEqual({
					contents: [
						verified
					],

					current:
						[],

					failures:
						[]
				});
			}
		);

		it(
			'recursively resolves a nested descriptor document',
			async () => {
				const nestedDescriptor =
					createDescriptor({
						resourceId:
							'kjvonly/resources/collections/plans',

						category:
							'kjvonly/resources/collections',

						representation:
							'descriptors'
					});

				const leafDescriptor =
					createDescriptor();

				const nestedBytes =
					new Uint8Array([
						4,
						5
					]);

				const verified =
					createVerifiedContent(
						leafDescriptor,
						new Uint8Array([
							1
						])
					);

				const documentDecoder = {
					decode:
						vi.fn(
							async () => [
								'leaf'
							]
						)
				};

				const descriptorContentResolver = {
					resolve:
						vi.fn(
							async () =>
								nestedBytes
						)
				};

				const resolver =
					new ResourceDescriptorGraphResolver(
						documentDecoder,
						{
							prepare:
								vi.fn(
									async (
										value:
											unknown
									) => ({
										status:
											'ready' as const,

										descriptor:
											value ===
											'nested'
												? nestedDescriptor
												: leafDescriptor
									})
							)
						},
						descriptorContentResolver,
						{
							resolve:
								vi.fn(
									async () =>
										verified
								)
						}
					);

				const result =
					await resolver.resolve(
						[
							'nested'
						],
						{
							publisher:
								PUBLISHER,

							resourceId:
								ROOT_RESOURCE_ID
						}
					);

				expect(
					descriptorContentResolver.resolve
				).toHaveBeenCalledWith(
					nestedDescriptor
				);

				expect(
					documentDecoder.decode
				).toHaveBeenCalledWith(
					nestedDescriptor.metadata.mediaType,
					nestedBytes
				);

				expect(
					result.contents
				).toEqual([
					verified
				]);
			}
		);

		it(
			'resolves an already-known terminal descriptor through the same graph path',
			async () => {
				const descriptor =
					createDescriptor();

				const verified =
					createVerifiedContent(
						descriptor,
						new Uint8Array([
							7,
							8
						])
					);

				const descriptorPreparer = {
					prepare:
						vi.fn(
							async () => ({
								status:
									'ready' as const,

								descriptor
							})
						)
				};

				const descriptorTerminalResolver = {
					resolve:
						vi.fn(
							async () =>
								verified
						)
				};

				const resolver =
					new ResourceDescriptorGraphResolver(
						{
							decode:
								vi.fn()
						},
						descriptorPreparer,
						{
							resolve:
								vi.fn()
						},
						descriptorTerminalResolver
					);

				const result =
					await resolver.resolveDescriptor(
						descriptor
					);

				expect(
					descriptorPreparer.prepare
				).toHaveBeenCalledWith(
					descriptor
				);

				expect(
					descriptorTerminalResolver.resolve
				).toHaveBeenCalledWith(
					descriptor
				);

				expect(
					result
				).toEqual({
					contents: [
						verified
					],

					current:
						[],

					failures:
						[]
				});
			}
		);

		it(
			'recursively resolves an already-known nested descriptor',
			async () => {
				const rootDescriptor =
					createDescriptor({
						resourceId:
							'kjvonly/resources/collections/plans',

						category:
							'kjvonly/resources/collections',

						representation:
							'descriptors'
					});

				const leafDescriptor =
					createDescriptor();

				const nestedBytes =
					new Uint8Array([
						4,
						5
					]);

				const verified =
					createVerifiedContent(
						leafDescriptor,
						new Uint8Array([
							1
						])
					);

				const descriptorContentResolver = {
					resolve:
						vi.fn(
							async () =>
								nestedBytes
						)
				};

				const resolver =
					new ResourceDescriptorGraphResolver(
						{
							decode:
								vi.fn(
									async () => [
										leafDescriptor
									]
								)
						},
						{
							prepare:
								vi.fn(
									async (
										value:
											unknown
									) => ({
										status:
											'ready' as const,

										descriptor:
											value as ResourceDescriptor
									})
								)
						},
						descriptorContentResolver,
						{
							resolve:
								vi.fn(
									async () =>
										verified
								)
						}
					);

				const result =
					await resolver.resolveDescriptor(
						rootDescriptor
					);

				expect(
					descriptorContentResolver.resolve
				).toHaveBeenCalledWith(
					rootDescriptor
				);

				expect(
					result.contents
				).toEqual([
					verified
				]);
			}
		);

		it(
			'preserves currentness for an already-known descriptor without retrieving bytes',
			async () => {
				const descriptor =
					createDescriptor();

				const descriptorContentResolver = {
					resolve:
						vi.fn()
				};

				const descriptorTerminalResolver = {
					resolve:
						vi.fn()
				};

				const resolver =
					new ResourceDescriptorGraphResolver(
						{
							decode:
								vi.fn()
						},
						{
							prepare:
								vi.fn(
									async () => ({
										status:
											'current' as const,

										descriptor
									})
								)
						},
						descriptorContentResolver,
						descriptorTerminalResolver
					);

				const result =
					await resolver.resolveDescriptor(
						descriptor
					);

				expect(
					descriptorContentResolver.resolve
				).not.toHaveBeenCalled();

				expect(
					descriptorTerminalResolver.resolve
				).not.toHaveBeenCalled();

				expect(
					result
				).toEqual({
					contents:
						[],

					current: [
						{
							publisher:
								descriptor.metadata.publisher,

							resourceId:
								descriptor.metadata.resourceId,

							resourceType:
								descriptor.metadata.category
						}
					],

					failures:
						[]
				});
			}
		);

		it(
			'preserves descriptor identity when preparation fails for an already-known descriptor',
			async () => {
				const descriptor =
					createDescriptor();

				const error =
					new Error(
						'currentness failed'
					);

				const resolver =
					new ResourceDescriptorGraphResolver(
						{
							decode:
								vi.fn()
						},
						{
							prepare:
								vi.fn(
									async () => ({
										status:
											'failed' as const,

										descriptor,
										error
									})
								)
						},
						{
							resolve:
								vi.fn()
						},
						{
							resolve:
								vi.fn()
						}
					);

				const result =
					await resolver.resolveDescriptor(
						descriptor
					);

				expect(
					result.failures
				).toEqual([
					{
						publisher:
							descriptor.metadata.publisher,

						resourceId:
							descriptor.metadata.resourceId,

						resourceType:
							descriptor.metadata.category,

						error
					}
				]);
			}
		);

		it(
			'detects a cycle below an already-known nested descriptor root',
			async () => {
				const descriptor =
					createDescriptor({
						resourceId:
							'kjvonly/resources/collections/self',

						category:
							'kjvonly/resources/collections',

						representation:
							'descriptors'
					});

				const descriptorContentResolver = {
					resolve:
						vi.fn(
							async () =>
								new Uint8Array([
									1
								])
						)
				};

				const resolver =
					new ResourceDescriptorGraphResolver(
						{
							decode:
								vi.fn(
									async () => [
										descriptor
									]
								)
						},
						{
							prepare:
								vi.fn(
									async () => ({
										status:
											'ready' as const,

										descriptor
									})
								)
						},
						descriptorContentResolver,
						{
							resolve:
								vi.fn()
						}
					);

				const result =
					await resolver.resolveDescriptor(
						descriptor
					);

				expect(
					descriptorContentResolver.resolve
				).toHaveBeenCalledTimes(
					1
				);

				expect(
					result.failures
				).toHaveLength(
					1
				);

				expect(
					result.failures[0]?.error
				).toEqual(
					expect.objectContaining({
						message:
							`Resource descriptor cycle: ${descriptor.metadata.publisher}/${descriptor.metadata.resourceId}`
					})
				);
			}
		);

		it(
			'rejects a cycle before retrieving nested descriptor bytes',
			async () => {
				const descriptor =
					createDescriptor({
						resourceId:
							ROOT_RESOURCE_ID,

						category:
							'kjvonly/resources/collections',

						representation:
							'descriptors'
					});

				const descriptorContentResolver = {
					resolve:
						vi.fn()
				};

				const resolver =
					new ResourceDescriptorGraphResolver(
						{
							decode:
								vi.fn()
						},
						{
							prepare:
								vi.fn(
									async () => ({
										status:
											'ready' as const,

										descriptor
									})
							)
						},
						descriptorContentResolver,
						{
							resolve:
								vi.fn()
						}
					);

				const result =
					await resolver.resolve(
						[
							{}
						],
						{
							publisher:
								PUBLISHER,

							resourceId:
								ROOT_RESOURCE_ID
						}
					);

				expect(
					descriptorContentResolver.resolve
				).not.toHaveBeenCalled();

				expect(
					result.failures
				).toHaveLength(
					1
				);

				expect(
					result.failures[0]?.error
				).toEqual(
					expect.objectContaining({
						message:
							`Resource descriptor cycle: ${PUBLISHER}/${ROOT_RESOURCE_ID}`
					})
				);
			}
		);
	}
);

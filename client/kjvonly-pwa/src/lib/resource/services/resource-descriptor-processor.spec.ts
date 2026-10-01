import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	ResourceDescriptor
} from '$lib/resource/descriptors/resource-descriptor';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	ResourceResolutionResult
} from '$lib/resource/resolution/resource-resolution-result';

import type {
	ResourceInstallResult
} from './resource-install-result';

import {
	ResourceDescriptorProcessor
} from './resource-descriptor-processor';

describe(
	'ResourceDescriptorProcessor',
	() => {
		it(
			'resolves the descriptor unchanged and processes the result with descriptor identity',
			async () => {
				const descriptor =
					resourceDescriptor();

				const resolution:
					ResourceResolutionResult = {
						contents: [],
						current: [],
						failures: []
					};

				const graphResolver =
					new FakeGraphResolver(
						resolution
					);

				const expected:
					ResourceInstallResult = {
						requested: {
							publisher:
								descriptor.metadata.publisher,

							resourceId:
								descriptor.metadata.resourceId
						},

						found:
							true,

						resources: []
					};

				const resolutionProcessor =
					new FakeResolutionProcessor(
						expected
					);

				const result =
					await new ResourceDescriptorProcessor(
						graphResolver,
						resolutionProcessor
					).process(
						descriptor
					);

				expect(
					graphResolver.descriptors
				).toEqual([
					descriptor
				]);

				expect(
					resolutionProcessor.requests
				).toEqual([
					{
						requested:
							expected.requested,

						resolution
					}
				]);

				expect(
					result
				).toBe(
					expected
				);
			}
		);
	}
);

function resourceDescriptor():
	ResourceDescriptor {
	return {
		metadata: {
			publisher:
				'publisher',

			resourceId:
				'resource-id',

			category:
				'example/resource',

			modifiedAt:
				123,

			representation:
				'content',

			mediaType:
				'application/json'
		},

		strategy: {
			type:
				'example',

			data:
				{}
		}
	};
}

class FakeGraphResolver {
	readonly descriptors:
		ResourceDescriptor[] =
			[];

	constructor(
		private readonly result:
			ResourceResolutionResult
	) {}

	async resolveDescriptor(
		descriptor:
			ResourceDescriptor
	): Promise<ResourceResolutionResult> {
		this.descriptors.push(
			descriptor
		);

		return this.result;
	}
}

interface ResolutionProcessorRequest {
	readonly requested:
		PublishedResourceReference;

	readonly resolution:
		ResourceResolutionResult;
}

class FakeResolutionProcessor {
	readonly requests:
		ResolutionProcessorRequest[] =
			[];

	constructor(
		private readonly result:
			ResourceInstallResult
	) {}

	async process(
		requested:
			PublishedResourceReference,

		resolution:
			ResourceResolutionResult
	): Promise<ResourceInstallResult> {
		this.requests.push({
			requested,
			resolution
		});

		return this.result;
	}
}

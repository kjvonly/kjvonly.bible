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
	ResourceResolutionStrategy
} from './resource-resolution-strategy';

import {
	ResourceResolutionStrategyRegistry
} from './resource-resolution-strategy-registry';

import {
	ResourceDescriptorContentResolver
} from './resource-descriptor-content-resolver';


describe(
	'ResourceDescriptorContentResolver',
	() => {
		it(
			'resolves descriptor bytes through the registered strategy',
			async () => {
				const content =
					new Uint8Array([
						1,
						2,
						3
					]);

				const strategy:
					ResourceResolutionStrategy = {
						type:
							'blossom',

						resolve:
							vi.fn(
								async () =>
									content
							)
					};

				const resolver =
					new ResourceDescriptorContentResolver(
						new ResourceResolutionStrategyRegistry([
							strategy
						])
					);

				const descriptor =
					createDescriptor();

				await expect(
					resolver.resolve(
						descriptor
					)
				).resolves.toBe(
					content
				);

				expect(
					strategy.resolve
				).toHaveBeenCalledWith(
					descriptor
				);
			}
		);

		it(
			'rejects an unsupported descriptor strategy',
			async () => {
				const resolver =
					new ResourceDescriptorContentResolver(
						new ResourceResolutionStrategyRegistry(
							[]
						)
					);

				await expect(
					resolver.resolve(
						createDescriptor()
					)
				).rejects.toThrow(
					'Unsupported Resource resolution strategy: blossom'
				);
			}
		);
	}
);

function createDescriptor():
	ResourceDescriptor {
	return {
		metadata: {
			publisher:
				'a'.repeat(
					64
				),

			resourceId:
				'kjvonly/bible/chapters/kjvs',

			category:
				'kjvonly/bible/chapters',

			modifiedAt:
				100,

			representation:
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

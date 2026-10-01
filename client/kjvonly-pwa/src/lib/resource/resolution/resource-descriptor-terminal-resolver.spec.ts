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
	ResourceDescriptorTerminalResolver
} from './resource-descriptor-terminal-resolver';

const PUBLISHER =
	'a'.repeat(
		64
	);


describe(
	'ResourceDescriptorTerminalResolver',
	() => {
		it(
			'resolves terminal content and preserves descriptor Resource metadata',
			async () => {
				const descriptor =
					createDescriptor();

				const content =
					new Uint8Array([
						1,
						2,
						3
					]);

				const contentResolver = {
					resolve:
						vi.fn(
							async () =>
								content
						)
				};

				const resolver =
					new ResourceDescriptorTerminalResolver(
						contentResolver
					);

				const result =
					await resolver.resolve(
						descriptor
					);

				expect(
					contentResolver.resolve
				).toHaveBeenCalledWith(
					descriptor
				);

				expect(
					result
				).toEqual({
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

					dataType:
						'kjvonly.bible.chapter/v1',

					metadata: {
						f:
							'notes'
					},

					content
				});
			}
		);

		it(
			'propagates serialized content resolution failures',
			async () => {
				const error =
					new Error(
						'resolution failed'
					);

				const resolver =
					new ResourceDescriptorTerminalResolver({
						resolve:
							vi.fn(
								async () => {
									throw error;
								}
							)
					});

				await expect(
					resolver.resolve(
						createDescriptor()
					)
				).rejects.toBe(
					error
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
				PUBLISHER,

			resourceId:
				'kjvonly/bible/chapters/kjvs',

			category:
				'kjvonly/bible/chapters',

			modifiedAt:
				100,

			representation:
				'content',

			mediaType:
				'application/json+gzip',

			dataType:
				'kjvonly.bible.chapter/v1'
		},

		resourceMetadata: {
			f:
				'notes'
		},

		strategy: {
			type:
				'blossom',

			data:
				{}
		}
	};
}

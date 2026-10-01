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
	ResourceDescriptorCurrentness
} from './resource-descriptor-currentness';


const PUBLISHER =
	'a'.repeat(
		64
	);


describe(
	'ResourceDescriptorCurrentness',
	() => {
		it(
			'checks Resource receipt currentness using descriptor identity and revision',
			async () => {
				const receiptService = {
					needsProcessing:
						vi.fn(
							async () =>
								false
						)
				};

				const currentness =
					new ResourceDescriptorCurrentness(
						receiptService
					);

				const descriptor =
					createDescriptor();

				const result =
					await currentness.needsProcessing(
						descriptor
					);

				expect(
					receiptService.needsProcessing
				).toHaveBeenCalledWith(
					PUBLISHER,
					'kjvonly/bible/chapters/kjvs',
					100
				);

				expect(
					result
				).toBe(
					false
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
				'application/json+gzip'
		},

		strategy: {
			type:
				'blossom',

			data: {}
		}
	};
}

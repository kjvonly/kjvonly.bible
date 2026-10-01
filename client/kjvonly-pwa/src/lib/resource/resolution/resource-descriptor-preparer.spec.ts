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
	ResourceDescriptorPreparer
} from './resource-descriptor-preparer';


const PUBLISHER =
	'a'.repeat(
		64
	);


describe(
	'ResourceDescriptorPreparer',
	() => {
		it(
			'prepares a validated descriptor that needs processing',
			async () => {
				const descriptor =
					createDescriptor();

				const descriptorValidator = {
					validate:
						vi.fn(
							() =>
								descriptor
						)
				};

				const descriptorCurrentness = {
					needsProcessing:
						vi.fn(
							async () =>
								true
						)
				};

				const preparer =
					new ResourceDescriptorPreparer(
						descriptorValidator,
						descriptorCurrentness
					);

				const value = {
					raw:
						true
				};

				await expect(
					preparer.prepare(
						value
					)
				).resolves.toEqual({
					status:
						'ready',

					descriptor
				});

				expect(
					descriptorValidator.validate
				).toHaveBeenCalledWith(
					value
				);

				expect(
					descriptorCurrentness.needsProcessing
				).toHaveBeenCalledWith(
					descriptor
				);
			}
		);

		it(
			'preserves a validated descriptor that is already current',
			async () => {
				const descriptor =
					createDescriptor();

				const preparer =
					new ResourceDescriptorPreparer(
						{
							validate:
								() =>
									descriptor
						},
						{
							needsProcessing:
								async () =>
									false
						}
					);

				await expect(
					preparer.prepare(
						{}
					)
				).resolves.toEqual({
					status:
						'current',

					descriptor
				});
			}
		);

		it(
			'reports validation failure without trusted descriptor identity',
			async () => {
				const error =
					new Error(
						'invalid descriptor'
					);

				const preparer =
					new ResourceDescriptorPreparer(
						{
							validate:
								() => {
									throw error;
								}
						},
						{
							needsProcessing:
								async () =>
									true
						}
					);

				await expect(
					preparer.prepare(
						{}
					)
				).resolves.toEqual({
					status:
						'failed',

					descriptor:
						undefined,

					error
				});
			}
		);

		it(
			'preserves validated descriptor identity when currentness fails',
			async () => {
				const descriptor =
					createDescriptor();

				const error =
					new Error(
						'currentness unavailable'
					);

				const preparer =
					new ResourceDescriptorPreparer(
						{
							validate:
								() =>
									descriptor
						},
						{
							needsProcessing:
								async () => {
									throw error;
								}
						}
					);

				await expect(
					preparer.prepare(
						{}
					)
				).resolves.toEqual({
					status:
						'failed',

					descriptor,
					error
				});
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

			data:
				{}
		}
	};
}

import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	ResourceRepresentation
} from '$lib/resource/models/resource.model';

import {
	ContentRepresentationResolver
} from './content-representation-resolver';

import type {
	ResourceRepresentationResolver
} from './resource-representation-resolver';

import type {
	ResourceResolutionResult
} from './resource-resolution-result';

import {
	ResourceResolver
} from './resource-resolver';

describe(
	'ResourceResolver',
	() => {

		it(
			'resolves an embedded content representation',
			async () => {
				const resolver =
					new ResourceResolver([
						new ContentRepresentationResolver()
					]);

				const result =
					await resolver.resolve(
						createResourceRepresentation()
					);

				expect(
					result.failures
				).toEqual(
					[]
				);

				expect(
					result.contents
				).toHaveLength(
					1
				);

				const content =
					result.contents[0];

				expect(
					content
				).toMatchObject({
					publisher:
						'a'.repeat(
							64
						),

					resourceId:
						'kjvonly/bible/chapters/kjv/1_1',

					resourceType:
						'kjvonly/bible/chapters',

					modifiedAt:
						123456,

					mediaType:
						'application/json'
				});

				expect(
					content.content
				).toBe(
					'{"chapter":1}'
				);
			}
		);

		it(
			'does not interpret serialized Resource content',
			async () => {
				const resolver =
					new ResourceResolver([
						new ContentRepresentationResolver()
					]);

				const result =
					await resolver.resolve(
						createResourceRepresentation({
							payload:
								'not-json'
						})
					);

				expect(
					result.contents[0]
						.content
				).toBe(
					'not-json'
				);
			}
		);

		it(
			'fails when no resolver supports the representation',
			async () => {
				const resolver =
					new ResourceResolver([
						new ContentRepresentationResolver()
					]);

				await expect(
					resolver.resolve(
						createResourceRepresentation({
							representation:
								'descriptors'
						})
					)
				).rejects.toThrow(
					'Unsupported Resource representation: descriptors'
				);
			}
		);

		it(
			'dispatches through the registered representation resolver',
			async () => {
				const resolved:
					ResourceResolutionResult = {
						contents:
							[],

						failures: [
							{
								error:
									new Error(
										'resolution failed'
									)
							}
						]
					};

				const descriptorsResolver:
					ResourceRepresentationResolver = {
						representation:
							'descriptors',

						resolve:
							vi.fn(
								async () =>
									resolved
							)
					};

				const resolver =
					new ResourceResolver([
						new ContentRepresentationResolver(),
						descriptorsResolver
					]);

				const resource =
					createResourceRepresentation({
						representation:
							'descriptors'
					});

				const result =
					await resolver.resolve(
						resource
					);

				expect(
					descriptorsResolver
						.resolve
				).toHaveBeenCalledWith(
					resource
				);

				expect(
					result
				).toBe(
					resolved
				);
			}
		);
	}
);

function createResourceRepresentation(
	overrides:
		Partial<ResourceRepresentation> =
			{}
): ResourceRepresentation {

	return {
		publisher:
			'a'.repeat(
				64
			),

		resourceId:
			'kjvonly/bible/chapters/kjv/1_1',

		resourceType:
			'kjvonly/bible/chapters',

		eventId:
			'b'.repeat(
				64
			),

		modifiedAt:
			123456,

		representation:
			'content',

		mediaType:
			'application/json',

		payload:
			'{"chapter":1}',

		...overrides
	};
}
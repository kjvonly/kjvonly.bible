import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	ResourceRepresentation,
	VerifiedResourceContent
} from '$lib/resource/models/resource.model';

import {
	ContentRepresentationResolver
} from './content-representation-resolver';

import type {
	ResourceRepresentationResolver
} from './resource-representation-resolver';

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
					result
				).toHaveLength(
					1
				);

				const content =
					result[0];

				expect(
					content
				).toMatchObject({
					publisher:
						'a'.repeat(64),

					resourceId:
						'kjvonly/bible/chapters/kjv/1_1',

					resourceType:
						'kjvonly/bible/chapters',

					eventId:
						'b'.repeat(64),

					createdAt:
						123456,

					mediaType:
						'application/json'
				});

				expect(
					new TextDecoder()
						.decode(
							content.content
						)
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
					new TextDecoder()
						.decode(
							result[0].content
						)
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
								'descriptor'
						})
					)
				).rejects.toThrow(
					'Unsupported Resource representation: descriptor'
				);
			}
		);

		it(
			'dispatches through the registered representation resolver',
			async () => {
				const resolved:
					readonly VerifiedResourceContent[] =
					[];

				const descriptorResolver:
					ResourceRepresentationResolver = {
						representation:
							'descriptor',

						resolve:
							vi.fn(
								async () =>
									resolved
							)
					};

				const resolver =
					new ResourceResolver([
						new ContentRepresentationResolver(),
						descriptorResolver
					]);

				const resource =
					createResourceRepresentation({
						representation:
							'descriptor'
					});

				const result =
					await resolver.resolve(
						resource
					);

				expect(
					descriptorResolver
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
			'a'.repeat(64),

		resourceId:
			'kjvonly/bible/chapters/kjv/1_1',

		resourceType:
			'kjvonly/bible/chapters',

		eventId:
			'b'.repeat(64),

		createdAt:
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
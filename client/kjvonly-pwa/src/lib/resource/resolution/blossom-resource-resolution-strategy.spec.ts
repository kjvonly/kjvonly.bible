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
	BlossomResourceResolutionStrategy
} from './blossom-resource-resolution-strategy';

const CONTENT =
	new TextEncoder()
		.encode(
			'hello'
		);

const CONTENT_SHA256 =
	'2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

describe(
	'BlossomResourceResolutionStrategy',
	() => {

		it(
			'uses the blossom strategy type',
			() => {
				const strategy =
					new BlossomResourceResolutionStrategy();

				expect(
					strategy.type
				).toBe(
					'blossom'
				);
			}
		);

		it(
			'resolves verified serialized Resource content',
			async () => {
				const fetcher =
					vi.fn(
						async () =>
							new Response(
								CONTENT,
								{
									status:
										200
								}
							)
					);

				const strategy =
					new BlossomResourceResolutionStrategy(
						fetcher
					);

				const result =
					await strategy.resolve(
						createDescriptor()
					);

				expect(
					fetcher
				).toHaveBeenCalledWith(
					'https://example.com/resource'
				);

				expect(
					result
				).toEqual(
					CONTENT
				);
			}
		);

		it(
			'requires strategy data to be an object',
			async () => {
				const strategy =
					new BlossomResourceResolutionStrategy();

				await expect(
					strategy.resolve(
						createDescriptor(
							null
						)
					)
				).rejects.toThrow(
					'Invalid Blossom strategy data.'
				);
			}
		);

		it(
			'requires a Resource URL',
			async () => {
				const strategy =
					new BlossomResourceResolutionStrategy();

				await expect(
					strategy.resolve(
						createDescriptor({
							sha256:
								CONTENT_SHA256
						})
					)
				).rejects.toThrow(
					'Invalid Blossom strategy URL.'
				);
			}
		);

		it(
			'rejects an invalid Resource URL',
			async () => {
				const strategy =
					new BlossomResourceResolutionStrategy();

				await expect(
					strategy.resolve(
						createDescriptor({
							url:
								'not-a-url',

							sha256:
								CONTENT_SHA256
						})
					)
				).rejects.toThrow(
					'Invalid Blossom strategy URL.'
				);
			}
		);

		it(
			'rejects a non-HTTP Resource URL',
			async () => {
				const strategy =
					new BlossomResourceResolutionStrategy();

				await expect(
					strategy.resolve(
						createDescriptor({
							url:
								'file:///resource',

							sha256:
								CONTENT_SHA256
						})
					)
				).rejects.toThrow(
					'Invalid Blossom strategy URL.'
				);
			}
		);

		it(
			'requires a valid SHA-256 hash',
			async () => {
				const strategy =
					new BlossomResourceResolutionStrategy();

				await expect(
					strategy.resolve(
						createDescriptor({
							url:
								'https://example.com/resource',

							sha256:
								'invalid'
						})
					)
				).rejects.toThrow(
					'Invalid Blossom strategy sha256.'
				);
			}
		);

		it(
			'rejects an invalid Resource size',
			async () => {
				const strategy =
					new BlossomResourceResolutionStrategy();

				await expect(
					strategy.resolve(
						createDescriptor({
							url:
								'https://example.com/resource',

							sha256:
								CONTENT_SHA256,

							size:
								-1
						})
					)
				).rejects.toThrow(
					'Invalid Blossom strategy size.'
				);
			}
		);

		it(
			'reports a missing Blossom Resource',
			async () => {
				const fetcher =
					vi.fn(
						async () =>
							new Response(
								null,
								{
									status:
										404
								}
							)
					);

				const strategy =
					new BlossomResourceResolutionStrategy(
						fetcher
					);

				await expect(
					strategy.resolve(
						createDescriptor()
					)
				).rejects.toThrow(
					'Blossom Resource not found.'
				);
			}
		);

		it(
			'reports an unsuccessful HTTP response',
			async () => {
				const fetcher =
					vi.fn(
						async () =>
							new Response(
								null,
								{
									status:
										500
								}
							)
					);

				const strategy =
					new BlossomResourceResolutionStrategy(
						fetcher
					);

				await expect(
					strategy.resolve(
						createDescriptor()
					)
				).rejects.toThrow(
					'Blossom retrieval failed: HTTP 500.'
				);
			}
		);

		it(
			'reports a retrieval failure',
			async () => {
				const fetcher =
					vi.fn(
						async () => {
							throw new Error(
								'network unavailable'
							);
						}
					);

				const strategy =
					new BlossomResourceResolutionStrategy(
						fetcher
					);

				await expect(
					strategy.resolve(
						createDescriptor()
					)
				).rejects.toThrow(
					'Blossom retrieval failed.'
				);
			}
		);

		it(
			'verifies the optional Resource size',
			async () => {
				const fetcher =
					vi.fn(
						async () =>
							new Response(
								CONTENT,
								{
									status:
										200
								}
							)
					);

				const strategy =
					new BlossomResourceResolutionStrategy(
						fetcher
					);

				await expect(
					strategy.resolve(
						createDescriptor({
							url:
								'https://example.com/resource',

							sha256:
								CONTENT_SHA256,

							size:
								CONTENT.byteLength +
								1
						})
					)
				).rejects.toThrow(
					'Blossom content size mismatch.'
				);
			}
		);

		it(
			'verifies Resource content integrity',
			async () => {
				const fetcher =
					vi.fn(
						async () =>
							new Response(
								CONTENT,
								{
									status:
										200
								}
							)
					);

				const strategy =
					new BlossomResourceResolutionStrategy(
						fetcher
					);

				await expect(
					strategy.resolve(
						createDescriptor({
							url:
								'https://example.com/resource',

							sha256:
								'0'.repeat(
									64
								),

							size:
								CONTENT.byteLength
						})
					)
				).rejects.toThrow(
					'Blossom content integrity check failed.'
				);
			}
		);

		it(
			'returns Resource content without decoding it',
			async () => {
				const content =
					new Uint8Array([
						0x1f,
						0x8b,
						0x08,
						0x00
					]);

				const fetcher =
					vi.fn(
						async () =>
							new Response(
								content,
								{
									status:
										200
								}
							)
					);

				const strategy =
					new BlossomResourceResolutionStrategy(
						fetcher
					);

				const result =
					await strategy.resolve(
						createDescriptor({
							url:
								'https://example.com/resource',

							sha256:
								'fd72d30440b0bae1b1c6db6c8ad807f238ef3ca613aa7e8d5329e1e8ddf7da72',

							size:
								content.byteLength
						})
					);

				expect(
					result
				).toEqual(
					content
				);
			}
		);
	}
);

function createDescriptor(
	data: unknown = {
		url:
			'https://example.com/resource',

		sha256:
			CONTENT_SHA256,

		size:
			CONTENT.byteLength
	}
): ResourceDescriptor {

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

			mediaType:
				'application/json+gzip'
		},

		strategy: {
			type:
				'blossom',

			data
		}
	};
}
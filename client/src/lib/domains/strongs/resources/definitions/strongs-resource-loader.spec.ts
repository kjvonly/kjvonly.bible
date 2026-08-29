import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import {
	StrongsResourceLoader
} from './strongs-resource-loader';

describe(
	'StrongsResourceLoader',
	() => {
		it(
			"loads an individual Strong's Resource when available",
			async () => {
				const resources =
					new FakeStrongsResourceService(
						async (
							reference
						) => {
							return (
								reference.resourceId ===
								'kjvonly/strongs/definitions/kjvs/G1'
							);
						}
					);

				const loader =
					new StrongsResourceLoader(
						resources
					);

				const result =
					await loader.load(
						'publisher',
						'kjvs',
						'G1'
					);

				expect(
					result
				).toBe(
					true
				);

				expect(
					resources.references
				).toEqual([
					{
						publisher:
							'publisher',

						resourceId:
							'kjvonly/strongs/definitions/kjvs/G1'
					}
				]);
			}
		);

		it(
			"falls back to the Strong's bundle when the individual Resource is not available",
			async () => {
				const resources =
					new FakeStrongsResourceService(
						async (
							reference
						) => {
							return (
								reference.resourceId ===
								'kjvonly/strongs/definitions/kjvs'
							);
						}
					);

				const loader =
					new StrongsResourceLoader(
						resources
					);

				const result =
					await loader.load(
						'publisher',
						'kjvs',
						'G1'
					);

				expect(
					result
				).toBe(
					true
				);

				expect(
					resources.references
				).toEqual([
					{
						publisher:
							'publisher',

						resourceId:
							'kjvonly/strongs/definitions/kjvs/G1'
					},
					{
						publisher:
							'publisher',

						resourceId:
							'kjvonly/strongs/definitions/kjvs'
					}
				]);
			}
		);

		it(
			'returns false when neither individual nor bundle Resource is available',
			async () => {
				const resources =
					new FakeStrongsResourceService(
						async () =>
							false
					);

				const loader =
					new StrongsResourceLoader(
						resources
					);

				const result =
					await loader.load(
						'publisher',
						'kjvs',
						'G1'
					);

				expect(
					result
				).toBe(
					false
				);

				expect(
					resources.references
				).toEqual([
					{
						publisher:
							'publisher',

						resourceId:
							'kjvonly/strongs/definitions/kjvs/G1'
					},
					{
						publisher:
							'publisher',

						resourceId:
							'kjvonly/strongs/definitions/kjvs'
					}
				]);
			}
		);

		it(
			'does not try the bundle when the individual Resource succeeds',
			async () => {
				const resources =
					new FakeStrongsResourceService(
						async () =>
							true
					);

				const loader =
					new StrongsResourceLoader(
						resources
					);

				await loader.load(
					'publisher',
					'kjvs',
					'H1'
				);

				expect(
					resources.references
				).toEqual([
					{
						publisher:
							'publisher',

						resourceId:
							'kjvonly/strongs/definitions/kjvs/H1'
					}
				]);
			}
		);

		it(
			'propagates individual Resource processing failures',
			async () => {
				const resources =
					new FakeStrongsResourceService(
						async () => {
							throw new Error(
								'validation failed'
							);
						}
					);

				const loader =
					new StrongsResourceLoader(
						resources
					);

				await expect(
					loader.load(
						'publisher',
						'kjvs',
						'G1'
					)
				).rejects.toThrow(
					'validation failed'
				);

				/*
				 * A processing failure is not
				 * equivalent to "not found".
				 *
				 * Do not hide it by trying
				 * another Resource.
				 */
				expect(
					resources.references
				).toEqual([
					{
						publisher:
							'publisher',

						resourceId:
							'kjvonly/strongs/definitions/kjvs/G1'
					}
				]);
			}
		);

		it(
			'propagates bundle Resource processing failures',
			async () => {
				const resources =
					new FakeStrongsResourceService(
						async (
							reference
						) => {
							if (
								reference.resourceId ===
								'kjvonly/strongs/definitions/kjvs/G1'
							) {
								return false;
							}

							throw new Error(
								'resolution failed'
							);
						}
					);

				const loader =
					new StrongsResourceLoader(
						resources
					);

				await expect(
					loader.load(
						'publisher',
						'kjvs',
						'G1'
					)
				).rejects.toThrow(
					'resolution failed'
				);

				expect(
					resources.references
				).toEqual([
					{
						publisher:
							'publisher',

						resourceId:
							'kjvonly/strongs/definitions/kjvs/G1'
					},
					{
						publisher:
							'publisher',

						resourceId:
							'kjvonly/strongs/definitions/kjvs'
					}
				]);
			}
		);
	}
);

class FakeStrongsResourceService {

	readonly references:
		PublishedResourceReference[] =
			[];

	constructor(
		private readonly onInstall:
			(
				reference:
					PublishedResourceReference
			) => Promise<boolean>
	) {}

	async install(
		reference:
			PublishedResourceReference
	): Promise<boolean> {

		this.references.push(
			reference
		);

		return await this.onInstall(
			reference
		);
	}
}
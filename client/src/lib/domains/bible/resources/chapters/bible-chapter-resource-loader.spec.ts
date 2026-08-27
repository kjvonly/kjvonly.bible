import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import {
	BibleChapterResourceLoader
} from './bible-chapter-resource-loader';

describe(
	'BibleChapterResourceLoader',
	() => {
		it(
			'loads the individual Chapter Resource first',
			async () => {
				const resources =
					new FakeResourceService([
						true
					]);

				const loader =
					new BibleChapterResourceLoader(
						resources
					);

				const result =
					await loader.load(
						'publisher',
						'kjvs',
						'1_1'
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
							'kjvonly/bible/chapters/kjvs/1_1'
					}
				]);
			}
		);

		it(
			'falls back to the version bundle when the individual Resource is not found',
			async () => {
				const resources =
					new FakeResourceService([
						false,
						true
					]);

				const loader =
					new BibleChapterResourceLoader(
						resources
					);

				const result =
					await loader.load(
						'publisher',
						'kjvs',
						'1_1'
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
							'kjvonly/bible/chapters/kjvs/1_1'
					},
					{
						publisher:
							'publisher',

						resourceId:
							'kjvonly/bible/chapters/kjvs'
					}
				]);
			}
		);

		it(
			'returns false when neither Resource exists',
			async () => {
				const resources =
					new FakeResourceService([
						false,
						false
					]);

				const loader =
					new BibleChapterResourceLoader(
						resources
					);

				expect(
					await loader.load(
						'publisher',
						'kjvs',
						'1_1'
					)
				).toBe(
					false
				);
			}
		);

		it(
			'propagates Resource processing failures',
			async () => {
				const resources = {
					async install():
						Promise<boolean> {
						throw new Error(
							'resolution failed'
						);
					}
				};

				const loader =
					new BibleChapterResourceLoader(
						resources
					);

				await expect(
					loader.load(
						'publisher',
						'kjvs',
						'1_1'
					)
				).rejects.toThrow(
					'resolution failed'
				);
			}
		);
	}
);

class FakeResourceService {

	readonly references:
		PublishedResourceReference[] =
			[];

	constructor(
		private readonly results:
			boolean[]
	) {}

	async install(
		reference:
			PublishedResourceReference
	): Promise<boolean> {
		this.references.push(
			reference
		);

		return (
			this.results.shift() ??
			false
		);
	}
}
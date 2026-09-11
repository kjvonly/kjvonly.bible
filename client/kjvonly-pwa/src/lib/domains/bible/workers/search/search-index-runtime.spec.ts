import {
	describe,
	expect,
	it
} from 'vitest';

import FlexSearch from 'flexsearch';

import type {
	BibleSearchIndex,
	BibleSearchIndexChunks
} from '$lib/domains/bible/models/bible-search-index.model';

import {
	SearchIndexRuntime
} from './search-index-runtime';

describe(
	'SearchIndexRuntime',
	() => {
		it(
			'imports and searches an installed Bible Search Index',
			async () => {
				const runtime =
					new SearchIndexRuntime();

				await runtime.initialize(
					await createSearchIndex(
						'publisher/kjvs',
						[
							[
								'1_1_1',
								'Gen 1:1 In the beginning God created the heaven and the earth.'
							],
							[
								'1_1_2',
								'Gen 1:2 And the earth was without form and void.'
							]
						]
					)
				);

				expect(
					await runtime.search(
						'publisher/kjvs',
						'beginning'
					)
				).toEqual([
					'1_1_1'
				]);
			}
		);

		it(
			'keeps independently selected Search Indexes isolated',
			async () => {
				const runtime =
					new SearchIndexRuntime();

				await runtime.initialize(
					await createSearchIndex(
						'publisher/kjv',
						[
							[
								'1_1_1',
								'alpha unique text'
							]
						]
					)
				);

				await runtime.initialize(
					await createSearchIndex(
						'publisher/kjvs',
						[
							[
								'2_1_1',
								'beta unique text'
							]
						]
					)
				);

				expect(
					await runtime.search(
						'publisher/kjv',
						'alpha'
					)
				).toEqual([
					'1_1_1'
				]);

				expect(
					await runtime.search(
						'publisher/kjvs',
						'alpha'
					)
				).toEqual([]);
			}
		);

		it(
			'preserves OR search and Bible location ordering',
			async () => {
				const runtime =
					new SearchIndexRuntime();

				await runtime.initialize(
					await createSearchIndex(
						'publisher/kjvs',
						[
							[
								'2_1_1',
								'beta'
							],
							[
								'1_10_2',
								'alpha'
							],
							[
								'1_2_3',
								'beta alpha'
							]
						]
					)
				);

				expect(
					await runtime.search(
						'publisher/kjvs',
						'alpha OR beta'
					)
				).toEqual([
					'1_2_3',
					'1_10_2',
					'2_1_1'
				]);
			}
		);

		it(
			'exports an initialized FlexSearch index',
			async () => {
				const runtime =
					new SearchIndexRuntime();

				const searchIndex =
					await createSearchIndex(
						'publisher/kjvs',
						[
							[
								'1_1_1',
								'alpha export text'
							]
						]
					);

				await runtime.initialize(
					searchIndex
				);

				const chunks =
					await runtime.export(
						searchIndex.id
					);

				const restored =
					new FlexSearch.Index();

				for (
					const [
						key,
						data
					] of Object.entries(
						chunks
					)
				) {
					await restored.import(
						key,
						data
					);
				}

				expect(
					await restored.searchAsync(
						'alpha'
					)
				).toContain(
					'1_1_1'
				);
			}
		);

		it(
			'does not re-import an already initialized Search Index',
			async () => {
				const runtime =
					new SearchIndexRuntime();

				await runtime.initialize(
					await createSearchIndex(
						'publisher/kjvs',
						[
							[
								'1_1_1',
								'alpha original text'
							]
						]
					)
				);

				await runtime.initialize(
					await createSearchIndex(
						'publisher/kjvs',
						[
							[
								'2_1_1',
								'beta replacement text'
							]
						]
					)
				);

				expect(
					await runtime.search(
						'publisher/kjvs',
						'alpha'
					)
				).toEqual([
					'1_1_1'
				]);

				expect(
					await runtime.search(
						'publisher/kjvs',
						'beta'
					)
				).toEqual([]);
			}
		);

		it(
			'fails when the requested Search Index has not been initialized',
			async () => {
				const runtime =
					new SearchIndexRuntime();

				await expect(
					runtime.search(
						'missing/index',
						'text'
					)
				).rejects.toThrow(
					'Search Index not initialized: missing/index'
				);
			}
		);
	}
);

async function createSearchIndex(
	id: string,
	entries:
		readonly (
			readonly [
				string,
				string
			]
		)[]
): Promise<BibleSearchIndex> {
	const index =
		new FlexSearch.Index();

	for (
		const [
			key,
			text
		] of entries
	) {
		await index.addAsync(
			key,
			text
		);
	}

	const chunks:
		Record<string, string> =
		{};

	await index.export(
		(
			key: string,
			data: string | undefined
		) => {
			chunks[key] =
				data ?? '';
		}
	);

	return {
		id,
		version:
			id.split('/').at(-1) ?? '',
		chunks:
			chunks as BibleSearchIndexChunks
	};
}

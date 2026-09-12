import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	BiblePericopes
} from '$lib/domains/bible/models/bible-pericopes.model';

import {
	createBiblePericopesId
} from '$lib/domains/bible/models/bible-pericopes.model';

import {
	PericopesService
} from './pericopes.service';

describe(
	'PericopesService',
	() => {
		it(
			'returns installed Pericopes without loading a Resource',
			async () => {
				const source =
					createSource();

				const pericopes =
					createPericopes(
						createBiblePericopesId(
							source.publisher,
							'default',
							'1_1'
						)
					);

				const store =
					new FakePericopesStore([
						pericopes
					]);

				const loader =
					new FakeResourceLoader();

				const service =
					new PericopesService(
						store,
						loader
					);

				const result =
					await service.get(
						source,
						'1_1_3'
					);

				expect(
					result
				).toBe(
					pericopes
				);

				expect(
					store.ids
				).toEqual([
					'publisher/default/1_1'
				]);

				expect(
					loader.calls
				).toEqual([]);
			}
		);

		it(
			'loads and rereads Pericopes on a local miss',
			async () => {
				const source =
					createSource();

				const pericopesId =
					createBiblePericopesId(
						source.publisher,
						'default',
						'1_1'
					);

				const pericopes =
					createPericopes(
						pericopesId
					);

				const store =
					new FakePericopesStore();

				const loader =
					new FakeResourceLoader(
						async () => {
							store.values.set(
								pericopesId,
								pericopes
							);

							return true;
						}
					);

				const service =
					new PericopesService(
						store,
						loader
					);

				const result =
					await service.get(
						source,
						'1_1'
					);

				expect(
					result
				).toBe(
					pericopes
				);

				expect(
					loader.calls
				).toEqual([
					{
						source,
						key:
							'1_1'
					}
				]);

				expect(
					store.ids
				).toEqual([
					pericopesId,
					pericopesId
				]);
			}
		);

		it(
			'creates the Pericopes id from the selected source and Chapter reference',
			async () => {
				const source =
					createSource({
						publisher:
							'publisher-a',

						resourceId:
							'kjvonly/overlays/pericopes/scheme-a'
					});

				const store =
					new FakePericopesStore();

				const loader =
					new FakeResourceLoader(
						async () =>
							false
					);

				const service =
					new PericopesService(
						store,
						loader
					);

				await expect(
					service.get(
						source,
						'2_3_4'
					)
				).rejects.toThrow();

				expect(
					store.ids
				).toEqual([
					'publisher-a/scheme-a/2_3'
				]);

				expect(
					loader.calls
				).toEqual([
					{
						source,
						key:
							'2_3'
					}
				]);
			}
		);

		it(
			'throws when no Resource can provide the Pericopes',
			async () => {
				const service =
					new PericopesService(
						new FakePericopesStore(),
						new FakeResourceLoader(
							async () =>
								false
						)
					);

				await expect(
					service.get(
						createSource(),
						'1_1'
					)
				).rejects.toThrow(
					'Bible Pericopes Resource not found'
				);
			}
		);

		it(
			'does not reread the store when no Pericopes Resource is found',
			async () => {
				const store =
					new FakePericopesStore();

				const service =
					new PericopesService(
						store,
						new FakeResourceLoader(
							async () =>
								false
						)
					);

				await expect(
					service.get(
						createSource(),
						'1_1'
					)
				).rejects.toThrow();

				expect(
					store.ids
				).toEqual([
					'publisher/default/1_1'
				]);
			}
		);

		it(
			'throws when Resource processing succeeds but the Pericopes are not installed',
			async () => {
				const store =
					new FakePericopesStore();

				const service =
					new PericopesService(
						store,
						new FakeResourceLoader(
							async () =>
								true
						)
					);

				await expect(
					service.get(
						createSource(),
						'1_1'
					)
				).rejects.toThrow(
					'Bible Pericopes were not installed'
				);

				expect(
					store.ids
				).toEqual([
					'publisher/default/1_1',
					'publisher/default/1_1'
				]);
			}
		);

		it(
			'propagates Resource loading failures',
			async () => {
				const service =
					new PericopesService(
						new FakePericopesStore(),
						new FakeResourceLoader(
							async () => {
								throw new Error(
									'resolution failed'
								);
							}
						)
					);

				await expect(
					service.get(
						createSource(),
						'1_1'
					)
				).rejects.toThrow(
					'resolution failed'
				);
			}
		);

		it(
			'rejects a source for another Resource Type',
			async () => {
				const store =
					new FakePericopesStore();

				const loader =
					new FakeResourceLoader();

				const service =
					new PericopesService(
						store,
						loader
					);

				await expect(
					service.get(
						createSource({
							resourceId:
								'kjvonly/bible/chapters/kjvs'
						}),
						'1_1'
					)
				).rejects.toThrow(
					'Invalid Bible Pericopes Resource Type'
				);

				expect(
					store.ids
				).toEqual([]);

				expect(
					loader.calls
				).toEqual([]);
			}
		);

		it(
			'rejects the Bible Pericopes Resource Type root as the selected source',
			async () => {
				const store =
					new FakePericopesStore();

				const loader =
					new FakeResourceLoader();

				const service =
					new PericopesService(
						store,
						loader
					);

				await expect(
					service.get(
						createSource({
							resourceId:
								'kjvonly/overlays/pericopes'
						}),
						'1_1'
					)
				).rejects.toThrow(
					'Invalid Bible Pericopes Resource source'
				);

				expect(
					store.ids
				).toEqual([]);

				expect(
					loader.calls
				).toEqual([]);
			}
		);

		it(
			'rejects a nested Pericopes Resource as the selected source',
			async () => {
				const store =
					new FakePericopesStore();

				const loader =
					new FakeResourceLoader();

				const service =
					new PericopesService(
						store,
						loader
					);

				await expect(
					service.get(
						createSource({
							resourceId:
								'kjvonly/overlays/pericopes/default/1_1'
						}),
						'1_1'
					)
				).rejects.toThrow(
					'Invalid Bible Pericopes Resource source'
				);

				expect(
					store.ids
				).toEqual([]);

				expect(
					loader.calls
				).toEqual([]);
			}
		);
	}
);

class FakePericopesStore {

	readonly values =
		new Map<
			string,
			BiblePericopes
		>();

	readonly ids:
		string[] =
			[];

	constructor(
		pericopes:
			readonly BiblePericopes[] =
				[]
	) {
		for (
			const value of pericopes
		) {
			this.values.set(
				value.id,
				value
			);
		}
	}

	async get(
		id: string
	): Promise<
		BiblePericopes |
		undefined
	> {
		this.ids.push(
			id
		);

		return this.values.get(
			id
		);
	}
}

class FakeResourceLoader {

	readonly calls:
		{
			source:
				PublishedResourceReference;

			key:
				string;
		}[] =
			[];

	constructor(
		private readonly onLoad:
			(
				source:
					PublishedResourceReference,

				key:
					string
			) => Promise<boolean> =
				async () =>
					true
	) {}

	async load(
		source:
			PublishedResourceReference,

		key:
			string
	): Promise<boolean> {

		this.calls.push({
			source,
			key
		});

		return await this.onLoad(
			source,
			key
		);
	}
}

function createSource(
	overrides:
		Partial<
			PublishedResourceReference
		> =
			{}
): PublishedResourceReference {

	return {
		publisher:
			'publisher',

		resourceId:
			'kjvonly/overlays/pericopes/default',

		...overrides
	};
}

function createPericopes(
	id: string
): BiblePericopes {
	return {
		id,

		chapterRef:
			'1_1',

		pericopes: {
			'1_1_1': [
				{
					text:
						'The Creation',

					ref:
						'1_1_1',

					words: [
						{
							text:
								'The Creation',

							class:
								null,

							href:
								null,

							emphasis:
								false
						}
					]
				}
			]
		}
	};
}

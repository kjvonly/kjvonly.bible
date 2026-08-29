import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	Strongs
} from '$lib/domains/strongs/models/strongs.model';

import {
	StrongsService
} from './strongs.service';

describe(
	'StrongsService',
	() => {
		it(
			"returns an existing Strong's definition without loading a Resource",
			async () => {
				const source =
					createSource();

				const strongsId =
					`${source.publisher}/kjvs/G1`;

				const strongs =
					createStrongs(
						strongsId
					);

				const store =
					new FakeStrongsStore([
						strongs
					]);

				const loader =
					new FakeResourceLoader();

				const service =
					new StrongsService(
						store,
						loader
					);

				const result =
					await service.get(
						source,
						'G1'
					);

				expect(
					result
				).toBe(
					strongs
				);

				expect(
					store.ids
				).toEqual([
					strongsId
				]);

				expect(
					loader.calls
				).toEqual(
					[]
				);
			}
		);

		it(
			"loads and returns a missing Strong's definition",
			async () => {
				const source =
					createSource();

				const strongsId =
					`${source.publisher}/kjvs/G1`;

				const strongs =
					createStrongs(
						strongsId
					);

				const store =
					new FakeStrongsStore();

				const loader =
					new FakeResourceLoader(
						async () => {
							store.values.set(
								strongsId,
								strongs
							);

							return true;
						}
					);

				const service =
					new StrongsService(
						store,
						loader
					);

				const result =
					await service.get(
						source,
						'G1'
					);

				expect(
					result
				).toBe(
					strongs
				);

				expect(
					loader.calls
				).toEqual([
					{
						source,
						key:
							'G1'
					}
				]);

				/*
				 * Initial local lookup +
				 * post-installation reread.
				 */
				expect(
					store.ids
				).toEqual([
					strongsId,
					strongsId
				]);
			}
		);

		it(
			"creates the Strong's id from the selected source and key",
			async () => {
				const source =
					createSource({
						publisher:
							'publisher-a',

						resourceId:
							'kjvonly/strongs/definitions/kjv'
					});

				const store =
					new FakeStrongsStore();

				const loader =
					new FakeResourceLoader(
						async () =>
							false
					);

				const service =
					new StrongsService(
						store,
						loader
					);

				await expect(
					service.get(
						source,
						'H123'
					)
				).rejects.toThrow();

				expect(
					store.ids
				).toEqual([
					'publisher-a/kjv/H123'
				]);

				expect(
					loader.calls
				).toEqual([
					{
						source,
						key:
							'H123'
					}
				]);
			}
		);

		it(
			"throws when no Resource can provide the Strong's definition",
			async () => {
				const source =
					createSource();

				const service =
					new StrongsService(
						new FakeStrongsStore(),
						new FakeResourceLoader(
							async () =>
								false
						)
					);

				await expect(
					service.get(
						source,
						'G1'
					)
				).rejects.toThrow(
					"Strong's Resource not found"
				);
			}
		);

		it(
			"throws when Resource processing succeeds but the Strong's definition is not installed",
			async () => {
				const source =
					createSource();

				const store =
					new FakeStrongsStore();

				const service =
					new StrongsService(
						store,
						new FakeResourceLoader(
							async () =>
								true
						)
					);

				await expect(
					service.get(
						source,
						'G1'
					)
				).rejects.toThrow(
					"Strong's definition was not installed"
				);

				expect(
					store.ids
				).toEqual([
					'publisher/kjvs/G1',
					'publisher/kjvs/G1'
				]);
			}
		);

		it(
			'propagates Resource loading failures',
			async () => {
				const source =
					createSource();

				const service =
					new StrongsService(
						new FakeStrongsStore(),
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
						source,
						'G1'
					)
				).rejects.toThrow(
					'resolution failed'
				);
			}
		);

		it(
			"does not reread the store when no Strong's Resource is found",
			async () => {
				const source =
					createSource();

				const store =
					new FakeStrongsStore();

				const service =
					new StrongsService(
						store,
						new FakeResourceLoader(
							async () =>
								false
						)
					);

				await expect(
					service.get(
						source,
						'G1'
					)
				).rejects.toThrow();

				expect(
					store.ids
				).toEqual([
					'publisher/kjvs/G1'
				]);
			}
		);

		it(
			"rejects a source for another Resource Type",
			async () => {
				const store =
					new FakeStrongsStore();

				const loader =
					new FakeResourceLoader();

				const service =
					new StrongsService(
						store,
						loader
					);

				await expect(
					service.get(
						createSource({
							resourceId:
								'kjvonly/bible/chapters/kjvs'
						}),
						'G1'
					)
				).rejects.toThrow(
					"Invalid Strong's Resource Type"
				);

				expect(
					store.ids
				).toEqual(
					[]
				);

				expect(
					loader.calls
				).toEqual(
					[]
				);
			}
		);

		it(
			"rejects an individual Strong's Resource as the selected source",
			async () => {
				const store =
					new FakeStrongsStore();

				const loader =
					new FakeResourceLoader();

				const service =
					new StrongsService(
						store,
						loader
					);

				await expect(
					service.get(
						createSource({
							resourceId:
								'kjvonly/strongs/definitions/kjvs/G1'
						}),
						'G1'
					)
				).rejects.toThrow(
					"Invalid Strong's Resource source"
				);

				expect(
					store.ids
				).toEqual(
					[]
				);

				expect(
					loader.calls
				).toEqual(
					[]
				);
			}
		);

		it(
			"rejects a Strong's Resource Type root as the selected source",
			async () => {
				const store =
					new FakeStrongsStore();

				const loader =
					new FakeResourceLoader();

				const service =
					new StrongsService(
						store,
						loader
					);

				await expect(
					service.get(
						createSource({
							resourceId:
								'kjvonly/strongs/definitions'
						}),
						'G1'
					)
				).rejects.toThrow(
					"Invalid Strong's Resource source"
				);

				expect(
					store.ids
				).toEqual(
					[]
				);

				expect(
					loader.calls
				).toEqual(
					[]
				);
			}
		);
	}
);

class FakeStrongsStore {

	readonly values =
		new Map<
			string,
			Strongs
		>();

	readonly ids:
		string[] =
			[];

	constructor(
		strongs:
			readonly Strongs[] =
				[]
	) {
		for (
			const value of strongs
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
		Strongs |
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
			'kjvonly/strongs/definitions/kjvs',

		...overrides
	};
}

function createStrongs(
	id: string
): Strongs {

	return {
		id,

		number:
			'G1',

		originalWord:
			'Α',

		partsOfSpeech:
			'noun',

		phoneticSpelling:
			'alpha',

		transliteratedWord:
			'A',

		usageByBook:
			[],

		usageByWord:
			[],

		brownDef:
			null,

		strongsDef:
			'definition',

		thayersDef:
			null
	};
}
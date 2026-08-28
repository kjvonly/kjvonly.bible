import {
	describe,
	expect,
	it
} from 'vitest';

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
				const publisher =
					'publisher';

				const strongsId =
					`${publisher}/kjvs/G1`;

				const strongs =
					createStrongs(
						strongsId
					);

				const store =
					new FakeStrongsStore([
						strongs
					]);

				const loader =
					new FakeStrongsResourceLoader();

				const service =
					new StrongsService(
						publisher,
						store,
						loader
					);

				const result =
					await service.get(
						'kjvs',
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
				const publisher =
					'publisher';

				const strongsId =
					`${publisher}/kjvs/G1`;

				const strongs =
					createStrongs(
						strongsId
					);

				const store =
					new FakeStrongsStore();

				const loader =
					new FakeStrongsResourceLoader(
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
						publisher,
						store,
						loader
					);

				const result =
					await service.get(
						'kjvs',
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
						publisher,

						version:
							'kjvs',

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
			"creates the Strong's id from publisher version and key",
			async () => {
				const store =
					new FakeStrongsStore();

				const loader =
					new FakeStrongsResourceLoader(
						async () =>
							false
					);

				const service =
					new StrongsService(
						'publisher-a',
						store,
						loader
					);

				await expect(
					service.get(
						'kjv',
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
						publisher:
							'publisher-a',

						version:
							'kjv',

						key:
							'H123'
					}
				]);
			}
		);

		it(
			"throws when no Resource can provide the Strong's definition",
			async () => {
				const service =
					new StrongsService(
						'publisher',
						new FakeStrongsStore(),
						new FakeStrongsResourceLoader(
							async () =>
								false
						)
					);

				await expect(
					service.get(
						'kjvs',
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
				const store =
					new FakeStrongsStore();

				const service =
					new StrongsService(
						'publisher',
						store,
						new FakeStrongsResourceLoader(
							async () =>
								true
						)
					);

				await expect(
					service.get(
						'kjvs',
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
				const service =
					new StrongsService(
						'publisher',
						new FakeStrongsStore(),
						new FakeStrongsResourceLoader(
							async () => {
								throw new Error(
									'resolution failed'
								);
							}
						)
					);

				await expect(
					service.get(
						'kjvs',
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
				const store =
					new FakeStrongsStore();

				const service =
					new StrongsService(
						'publisher',
						store,
						new FakeStrongsResourceLoader(
							async () =>
								false
						)
					);

				await expect(
					service.get(
						'kjvs',
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

class FakeStrongsResourceLoader {

	readonly calls:
		{
			publisher:
				string;

			version:
				string;

			key:
				string;
		}[] =
			[];

	constructor(
		private readonly onLoad:
			(
				publisher:
					string,

				version:
					string,

				key:
					string
			) => Promise<boolean> =
				async () =>
					true
	) {}

	async load(
		publisher: string,
		version: string,
		key: string
	): Promise<boolean> {

		this.calls.push({
			publisher,
			version,
			key
		});

		return await this.onLoad(
			publisher,
			version,
			key
		);
	}
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
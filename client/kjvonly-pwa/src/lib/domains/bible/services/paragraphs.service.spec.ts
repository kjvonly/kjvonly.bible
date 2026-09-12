import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	BibleParagraphs
} from '$lib/domains/bible/models/bible-paragraphs.model';

import {
	createBibleParagraphsId
} from '$lib/domains/bible/models/bible-paragraphs.model';

import {
	ParagraphsService
} from './paragraphs.service';

describe(
	'ParagraphsService',
	() => {
		it(
			'returns installed Paragraphs without loading a Resource',
			async () => {
				const source =
					createSource();

				const paragraphs =
					createParagraphs(
						createBibleParagraphsId(
							source.publisher,
							'default',
							'1_1'
						)
					);

				const store =
					new FakeParagraphsStore([
						paragraphs
					]);

				const loader =
					new FakeResourceLoader();

				const service =
					new ParagraphsService(
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
					paragraphs
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
			'loads and rereads Paragraphs on a local miss',
			async () => {
				const source =
					createSource();

				const paragraphsId =
					createBibleParagraphsId(
						source.publisher,
						'default',
						'1_1'
					);

				const paragraphs =
					createParagraphs(
						paragraphsId
					);

				const store =
					new FakeParagraphsStore();

				const loader =
					new FakeResourceLoader(
						async () => {
							store.values.set(
								paragraphsId,
								paragraphs
							);

							return true;
						}
					);

				const service =
					new ParagraphsService(
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
					paragraphs
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
					paragraphsId,
					paragraphsId
				]);
			}
		);

		it(
			'creates the Paragraphs id from the selected source and Chapter reference',
			async () => {
				const source =
					createSource({
						publisher:
							'publisher-a',

						resourceId:
							'kjvonly/overlays/paragraphs/scheme-a'
					});

				const store =
					new FakeParagraphsStore();

				const loader =
					new FakeResourceLoader(
						async () =>
							false
					);

				const service =
					new ParagraphsService(
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
			'throws when no Resource can provide the Paragraphs',
			async () => {
				const service =
					new ParagraphsService(
						new FakeParagraphsStore(),
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
					'Bible Paragraphs Resource not found'
				);
			}
		);

		it(
			'does not reread the store when no Paragraphs Resource is found',
			async () => {
				const store =
					new FakeParagraphsStore();

				const service =
					new ParagraphsService(
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
			'throws when Resource processing succeeds but the Paragraphs are not installed',
			async () => {
				const store =
					new FakeParagraphsStore();

				const service =
					new ParagraphsService(
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
					'Bible Paragraphs were not installed'
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
					new ParagraphsService(
						new FakeParagraphsStore(),
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
					new FakeParagraphsStore();

				const loader =
					new FakeResourceLoader();

				const service =
					new ParagraphsService(
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
					'Invalid Bible Paragraphs Resource Type'
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
			'rejects the Bible Paragraphs Resource Type root as the selected source',
			async () => {
				const store =
					new FakeParagraphsStore();

				const loader =
					new FakeResourceLoader();

				const service =
					new ParagraphsService(
						store,
						loader
					);

				await expect(
					service.get(
						createSource({
							resourceId:
								'kjvonly/overlays/paragraphs'
						}),
						'1_1'
					)
				).rejects.toThrow(
					'Invalid Bible Paragraphs Resource source'
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
			'rejects a nested Paragraphs Resource as the selected source',
			async () => {
				const store =
					new FakeParagraphsStore();

				const loader =
					new FakeResourceLoader();

				const service =
					new ParagraphsService(
						store,
						loader
					);

				await expect(
					service.get(
						createSource({
							resourceId:
								'kjvonly/overlays/paragraphs/default/1_1'
						}),
						'1_1'
					)
				).rejects.toThrow(
					'Invalid Bible Paragraphs Resource source'
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

class FakeParagraphsStore {

	readonly values =
		new Map<
			string,
			BibleParagraphs
		>();

	readonly ids:
		string[] =
			[];

	constructor(
		paragraphs:
			readonly BibleParagraphs[] =
				[]
	) {
		for (
			const value of paragraphs
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
		BibleParagraphs |
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
			'kjvonly/overlays/paragraphs/default',

		...overrides
	};
}

function createParagraphs(
	id: string
): BibleParagraphs {
	return {
		id,

		chapterRef:
			'1_1',

		paragraphs: {
			'1_1_6_0': {}
		}
	};
}

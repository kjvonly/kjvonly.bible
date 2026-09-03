import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource/models/resource.model';

import type {
	Chapter
} from '$lib/domains/bible/models/bible.model';

import {
	createBibleVersionId,
	createChapterId
} from '$lib/domains/bible/utils/bible-identity';

import {
	ChapterService
} from './chapter.service';

describe(
	'ChapterService',
	() => {
		it(
			'returns an installed Chapter without loading a Resource',
			async () => {
				const source =
					createSource();

				const bibleVersionId =
					createBibleVersionId(
						source.publisher,
						'kjvs'
					);

				const chapter =
					createChapter(
						createChapterId(
							bibleVersionId,
							'1_1'
						)
					);

				const chapters =
					new FakeChapterStore([
						chapter
					]);

				const loader =
					new FakeResourceLoader();

				const service =
					new ChapterService(
						chapters,
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
					chapter
				);

				expect(
					chapters.ids
				).toEqual([
					'publisher/kjvs/1_1'
				]);

				expect(
					loader.calls
				).toEqual([]);
			}
		);

		it(
			'loads and rereads a Chapter on a local miss',
			async () => {
				const source =
					createSource();

				const bibleVersionId =
					createBibleVersionId(
						source.publisher,
						'kjvs'
					);

				const chapterId =
					createChapterId(
						bibleVersionId,
						'1_1'
					);

				const chapter =
					createChapter(
						chapterId
					);

				const chapters =
					new FakeChapterStore();

				const loader =
					new FakeResourceLoader(
						async () => {
							chapters.values.set(
								chapterId,
								chapter
							);

							return true;
						}
					);

				const service =
					new ChapterService(
						chapters,
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
					chapter
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

				/*
				 * Initial local lookup +
				 * post-installation reread.
				 */
				expect(
					chapters.ids
				).toEqual([
					chapterId,
					chapterId
				]);
			}
		);

		it(
			'creates the Chapter id from the selected source and Chapter reference',
			async () => {
				const source =
					createSource({
						publisher:
							'publisher-a',

						resourceId:
							'kjvonly/bible/chapters/kjv'
					});

				const chapters =
					new FakeChapterStore();

				const loader =
					new FakeResourceLoader(
						async () =>
							false
					);

				const service =
					new ChapterService(
						chapters,
						loader
					);

				await expect(
					service.get(
						source,
						'2_3_4'
					)
				).rejects.toThrow();

				expect(
					chapters.ids
				).toEqual([
					'publisher-a/kjv/2_3'
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
			'throws when no Resource can provide the Chapter',
			async () => {
				const source =
					createSource();

				const service =
					new ChapterService(
						new FakeChapterStore(),
						new FakeResourceLoader(
							async () =>
								false
						)
					);

				await expect(
					service.get(
						source,
						'1_1'
					)
				).rejects.toThrow(
					'Bible Chapter Resource not found'
				);
			}
		);

		it(
			'does not reread the store when no Chapter Resource is found',
			async () => {
				const source =
					createSource();

				const chapters =
					new FakeChapterStore();

				const service =
					new ChapterService(
						chapters,
						new FakeResourceLoader(
							async () =>
								false
						)
					);

				await expect(
					service.get(
						source,
						'1_1'
					)
				).rejects.toThrow();

				expect(
					chapters.ids
				).toEqual([
					'publisher/kjvs/1_1'
				]);
			}
		);

		it(
			'throws when Resource processing succeeds but the Chapter is not installed',
			async () => {
				const source =
					createSource();

				const chapters =
					new FakeChapterStore();

				const service =
					new ChapterService(
						chapters,
						new FakeResourceLoader(
							async () =>
								true
						)
					);

				await expect(
					service.get(
						source,
						'1_1'
					)
				).rejects.toThrow(
					'Bible Chapter was not installed'
				);

				expect(
					chapters.ids
				).toEqual([
					'publisher/kjvs/1_1',
					'publisher/kjvs/1_1'
				]);
			}
		);

		it(
			'propagates Resource loading failures',
			async () => {
				const source =
					createSource();

				const service =
					new ChapterService(
						new FakeChapterStore(),
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
				const chapters =
					new FakeChapterStore();

				const loader =
					new FakeResourceLoader();

				const service =
					new ChapterService(
						chapters,
						loader
					);

				await expect(
					service.get(
						createSource({
							resourceId:
								'kjvonly/strongs/definitions/kjvs'
						}),
						'1_1'
					)
				).rejects.toThrow(
					'Invalid Bible Chapter Resource Type'
				);

				expect(
					chapters.ids
				).toEqual([]);

				expect(
					loader.calls
				).toEqual([]);
			}
		);

		it(
			'rejects an individual Chapter Resource as the selected source',
			async () => {
				const chapters =
					new FakeChapterStore();

				const loader =
					new FakeResourceLoader();

				const service =
					new ChapterService(
						chapters,
						loader
					);

				await expect(
					service.get(
						createSource({
							resourceId:
								'kjvonly/bible/chapters/kjvs/1_1'
						}),
						'1_1'
					)
				).rejects.toThrow(
					'Invalid Bible Chapter Resource source'
				);

				expect(
					chapters.ids
				).toEqual([]);

				expect(
					loader.calls
				).toEqual([]);
			}
		);

		it(
			'rejects the Bible Chapter Resource Type root as the selected source',
			async () => {
				const chapters =
					new FakeChapterStore();

				const loader =
					new FakeResourceLoader();

				const service =
					new ChapterService(
						chapters,
						loader
					);

				await expect(
					service.get(
						createSource({
							resourceId:
								'kjvonly/bible/chapters'
						}),
						'1_1'
					)
				).rejects.toThrow(
					'Invalid Bible Chapter Resource source'
				);

				expect(
					chapters.ids
				).toEqual([]);

				expect(
					loader.calls
				).toEqual([]);
			}
		);
	}
);

class FakeChapterStore {

	readonly values =
		new Map<
			string,
			Chapter
		>();

	readonly ids:
		string[] =
			[];

	constructor(
		chapters:
			readonly Chapter[] =
				[]
	) {
		for (
			const chapter of chapters
		) {
			this.values.set(
				chapter.id,
				chapter
			);
		}
	}

	async get(
		id: string
	): Promise<
		Chapter |
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
			'kjvonly/bible/chapters/kjvs',

		...overrides
	};
}

function createChapter(
	id: string
): Chapter {

	return {
		id,

		number:
			1,

		bookName:
			'Genesis',

		verses: {},

		verseMap: {},

		footnotes: {}
	};
}
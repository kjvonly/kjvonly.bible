import {
	describe,
	expect,
	it
} from 'vitest';

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
				const bibleVersionId =
					createBibleVersionId(
						'publisher',
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
					new FakeChapterResourceLoader();

				const service =
					new ChapterService(
						chapters,
						loader
					);

				const result =
					await service.get(
						bibleVersionId,
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
				const bibleVersionId =
					createBibleVersionId(
						'publisher',
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
					new FakeChapterResourceLoader(
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
						bibleVersionId,
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
						publisher:
							'publisher',

						version:
							'kjvs',

						chapterRef:
							'1_1'
					}
				]);

				expect(
					chapters.ids
				).toEqual([
					chapterId,
					chapterId
				]);
			}
		);

		it(
			'throws when no Resource can provide the Chapter',
			async () => {
				const service =
					new ChapterService(
						new FakeChapterStore(),
						new FakeChapterResourceLoader(
							async () =>
								false
						)
					);

				await expect(
					service.get(
						'publisher/kjvs',
						'1_1'
					)
				).rejects.toThrow(
					'Bible Chapter Resource not found: publisher/kjvs/1_1'
				);
			}
		);

		it(
			'throws when Resource processing succeeds but the Chapter is not installed',
			async () => {
				const service =
					new ChapterService(
						new FakeChapterStore(),
						new FakeChapterResourceLoader(
							async () =>
								true
						)
					);

				await expect(
					service.get(
						'publisher/kjvs',
						'1_1'
					)
				).rejects.toThrow(
					'Bible Chapter was not installed'
				);
			}
		);

		it(
			'propagates Resource loading failures',
			async () => {
				const service =
					new ChapterService(
						new FakeChapterStore(),
						new FakeChapterResourceLoader(
							async () => {
								throw new Error(
									'resolution failed'
								);
							}
						)
					);

				await expect(
					service.get(
						'publisher/kjvs',
						'1_1'
					)
				).rejects.toThrow(
					'resolution failed'
				);
			}
		);

		it(
			'rejects a bare Bible version',
			async () => {
				const service =
					new ChapterService(
						new FakeChapterStore(),
						new FakeChapterResourceLoader()
					);

				await expect(
					service.get(
						'kjvs',
						'1_1'
					)
				).rejects.toThrow(
					'Invalid Bible Version id'
				);
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

class FakeChapterResourceLoader {

	readonly calls:
		{
			publisher:
				string;

			version:
				string;

			chapterRef:
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

				chapterRef:
					string
			) => Promise<boolean> =
				async () =>
					true
	) {}

	async load(
		publisher: string,
		version: string,
		chapterRef: string
	): Promise<boolean> {

		this.calls.push({
			publisher,
			version,
			chapterRef
		});

		return await this.onLoad(
			publisher,
			version,
			chapterRef
		);
	}
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
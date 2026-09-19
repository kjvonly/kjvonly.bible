import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublishedResourceReference
} from '$lib/resource';

import type {
	Chapter,
	Verse
} from '$lib/domains/bible/models/bible.model';

import {
	VerseService
} from './verse.service';

describe(
	'VerseService',
	() => {
		it(
			'returns the requested Verse from the selected Chapter',
			async () => {
				const source =
					createSource();

				const verse:
					Verse = {
						number: 3,
						words: [],
						text:
							'And God said'
					};

				const chapter =
					createChapter({
						'3': verse
					});

				const chapters =
					new FakeChapterService(
						chapter
					);

				const locations =
					new FakeLocationReferenceService(
						3
					);

				const service =
					new VerseService(
						chapters,
						locations
					);

				const result =
					await service.get(
						source,
						'1_1_3_2'
					);

				expect(result)
					.toBe(verse);

				expect(
					chapters.calls
				).toEqual([
					{
						source,
						bibleLocationRef:
							'1_1_3_2'
					}
				]);

				expect(
					locations.refs
				).toEqual([
					'1_1_3_2'
				]);
			}
		);

		it(
			'returns an empty Verse when the requested Verse is absent',
			async () => {
				const service =
					new VerseService(
						new FakeChapterService(
							createChapter()
						),
						new FakeLocationReferenceService(
							9
						)
					);

				await expect(
					service.get(
						createSource(),
						'1_1_9'
					)
				).resolves.toEqual({
					number: 0,
					words: [],
					text: ''
				});
			}
		);
	}
);

class FakeChapterService {
	readonly calls:
		Array<{
			readonly source:
				PublishedResourceReference;
			readonly bibleLocationRef:
				string;
		}> = [];

	constructor(
		private readonly chapter:
			Chapter
	) {}

	async get(
		source:
			PublishedResourceReference,
		bibleLocationRef:
			string
	): Promise<Chapter> {
		this.calls.push({
			source,
			bibleLocationRef
		});

		return this.chapter;
	}
}

class FakeLocationReferenceService {
	readonly refs:
		string[] = [];

	constructor(
		private readonly verse:
			number
	) {}

	extractVerse(
		ref: string
	): number {
		this.refs.push(ref);

		return this.verse;
	}
}

function createChapter(
	verses:
		Chapter['verses'] = {}
): Chapter {
	return {
		id:
			'publisher/kjvs/1_1',
		number: 1,
		bookName:
			'Genesis',
		verses,
		verseMap: {},
		footnotes: {}
	};
}

function createSource(): PublishedResourceReference {
	return {
		publisher:
			'publisher',
		resourceId:
			'kjvonly/bible/chapters/kjvs/1_1'
	};
}

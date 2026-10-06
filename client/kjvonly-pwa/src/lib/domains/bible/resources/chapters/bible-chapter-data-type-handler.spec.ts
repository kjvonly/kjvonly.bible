import {
	describe,
	expect,
	it
} from 'vitest';

import {
	BIBLE_CHAPTER_DATA_TYPE,
	BIBLE_CHAPTER_DATA_VERSION
} from './bible-chapter-resource';

import {
	BibleChapterDataTypeHandler
} from './bible-chapter-data-type-handler';

describe(
	'BibleChapterDataTypeHandler',
	() => {
		it(
			'exposes the published Chapter semantic contract',
			() => {
				const handler =
					new BibleChapterDataTypeHandler();

				expect(
					handler.dataType
				).toBe(
					BIBLE_CHAPTER_DATA_TYPE
				);

				expect(
					handler.dataVersion
				).toBe(
					BIBLE_CHAPTER_DATA_VERSION
				);
			}
		);

		it(
			'accepts individual and bundle Chapter payloads without interpreting Resource ID',
			() => {
				const handler =
					new BibleChapterDataTypeHandler();

				const chapter =
					createChapterContent(
						1
					);

				expect(
					handler.validate(
						chapter
					)
				).toEqual(
					chapter
				);

				expect(
					handler.validate({
						'any-identity/1_1':
							chapter
					})
				).toEqual({
					'any-identity/1_1':
						chapter
				});
			}
		);

	}
);

function createChapterContent(
	number: number
) {
	return {
		number,
		bookName:
			'Genesis',
		verses: {},
		verseMap: {},
		footnotes: {}
	};
}

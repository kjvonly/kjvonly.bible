import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	DecodedResourceContent
} from '$lib/resource/models/resource.model';

import {
	BIBLE_CHAPTER_RESOURCE_TYPE,
	BibleChapterInterpreter
} from './bible-chapter-interpreter';

describe(
	'BibleChapterInterpreter',
	() => {
		it(
			'interprets an individual Chapter Resource',
			() => {
				const interpreter =
					new BibleChapterInterpreter();

				const value = {
					number:
						1,

					bookName:
						'Genesis'
				};

				const result =
					Array.from(
						interpreter.interpret(
							createDecodedResource({
								resourceId:
									'kjvonly/bible/chapters/kjvs/1_1',

								value
							})
						)
					);

				expect(
					result
				).toEqual([
					{
						version:
							'kjvs',

						chapterRef:
							'1_1',

						value
					}
				]);
			}
		);

		it(
			'interprets a Chapter bundle Resource',
			() => {
				const interpreter =
					new BibleChapterInterpreter();

				const genesis1 = {
					number:
						1,

					bookName:
						'Genesis'
				};

				const genesis2 = {
					number:
						2,

					bookName:
						'Genesis'
				};

				const result =
					Array.from(
						interpreter.interpret(
							createDecodedResource({
								resourceId:
									'kjvonly/bible/chapters/kjvs',

								value: {
									'kjvs/1_1':
										genesis1,

									'kjvs/1_2':
										genesis2
								}
							})
						)
					);

				expect(
					result
				).toEqual([
					{
						version:
							'kjvs',

						chapterRef:
							'1_1',

						value:
							genesis1
					},
					{
						version:
							'kjvs',

						chapterRef:
							'1_2',

						value:
							genesis2
					}
				]);
			}
		);

		it(
			'does not perform Chapter schema validation',
			() => {
				const interpreter =
					new BibleChapterInterpreter();

				const result =
					Array.from(
						interpreter.interpret(
							createDecodedResource({
								resourceId:
									'kjvonly/bible/chapters/kjvs/1_1',

								value:
									'not-a-chapter'
							})
						)
					);

				expect(
					result
				).toEqual([
					{
						version:
							'kjvs',

						chapterRef:
							'1_1',

						value:
							'not-a-chapter'
					}
				]);
			}
		);

		it(
			'rejects the wrong Resource Type',
			() => {
				const interpreter =
					new BibleChapterInterpreter();

				expect(
					() =>
						Array.from(
							interpreter.interpret(
								createDecodedResource({
									resourceType:
										'kjvonly/bible/strongs'
								})
							)
						)
				).toThrow(
					'Invalid Bible Chapter Resource Type: kjvonly/bible/strongs'
				);
			}
		);

		it(
			'rejects the Resource Type root',
			() => {
				const interpreter =
					new BibleChapterInterpreter();

				expect(
					() =>
						Array.from(
							interpreter.interpret(
								createDecodedResource({
									resourceId:
										'kjvonly/bible/chapters'
								})
							)
						)
				).toThrow(
					'Invalid Bible Chapter Resource path: kjvonly/bible/chapters'
				);
			}
		);

		it(
			'rejects a Resource path with too many segments',
			() => {
				const interpreter =
					new BibleChapterInterpreter();

				expect(
					() =>
						Array.from(
							interpreter.interpret(
								createDecodedResource({
									resourceId:
										'kjvonly/bible/chapters/kjvs/1_1/extra'
								})
							)
						)
				).toThrow(
					'Invalid Bible Chapter Resource path: kjvonly/bible/chapters/kjvs/1_1/extra'
				);
			}
		);

		it(
			'rejects non-object bundle content',
			() => {
				const interpreter =
					new BibleChapterInterpreter();

				expect(
					() =>
						Array.from(
							interpreter.interpret(
								createDecodedResource({
									resourceId:
										'kjvonly/bible/chapters/kjvs',

									value:
										'not-a-bundle'
								})
							)
						)
				).toThrow(
					'Bible Chapter bundle content must be an object.'
				);
			}
		);

		it(
			'rejects array bundle content',
			() => {
				const interpreter =
					new BibleChapterInterpreter();

				expect(
					() =>
						Array.from(
							interpreter.interpret(
								createDecodedResource({
									resourceId:
										'kjvonly/bible/chapters/kjvs',

									value: []
								})
							)
						)
				).toThrow(
					'Bible Chapter bundle content must be an object.'
				);
			}
		);

		it(
			'rejects a malformed bundle entry key',
			() => {
				const interpreter =
					new BibleChapterInterpreter();

				expect(
					() =>
						Array.from(
							interpreter.interpret(
								createDecodedResource({
									resourceId:
										'kjvonly/bible/chapters/kjvs',

									value: {
										'1_1': {}
									}
								})
							)
						)
				).toThrow(
					'Invalid Bible Chapter bundle entry: 1_1'
				);
			}
		);

		it(
			'rejects a bundle entry with too many path segments',
			() => {
				const interpreter =
					new BibleChapterInterpreter();

				expect(
					() =>
						Array.from(
							interpreter.interpret(
								createDecodedResource({
									resourceId:
										'kjvonly/bible/chapters/kjvs',

									value: {
										'kjvs/1_1/extra': {}
									}
								})
							)
						)
				).toThrow(
					'Invalid Bible Chapter bundle entry: kjvs/1_1/extra'
				);
			}
		);

		it(
			'rejects a bundle entry whose version does not match the Resource version',
			() => {
				const interpreter =
					new BibleChapterInterpreter();

				expect(
					() =>
						Array.from(
							interpreter.interpret(
								createDecodedResource({
									resourceId:
										'kjvonly/bible/chapters/kjvs',

									value: {
										'kjv/1_1': {}
									}
								})
							)
						)
				).toThrow(
					'Bible Chapter bundle entry version does not match Resource version: kjv/1_1'
				);
			}
		);
	}
);

function createDecodedResource(
	overrides:
		Partial<DecodedResourceContent> =
			{}
): DecodedResourceContent {
	return {
		publisher:
			'a'.repeat(
				64
			),

		resourceId:
			'kjvonly/bible/chapters/kjvs/1_1',

		resourceType:
			BIBLE_CHAPTER_RESOURCE_TYPE,

		eventId:
			'b'.repeat(
				64
			),

		modifiedAt:
			123456,

		mediaType:
			'application/json',

		value: {
			number:
				1,

			bookName:
				'Genesis'
		},

		...overrides
	};
}
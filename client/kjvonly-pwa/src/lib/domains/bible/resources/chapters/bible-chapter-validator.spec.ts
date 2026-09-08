import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleChapterCandidate
} from './bible-chapter-candidate';

import {
	BibleChapterValidator
} from './bible-chapter-validator';

describe(
	'BibleChapterValidator',
	() => {
		it(
			'validates Bible Chapter content',
			() => {
				const validator =
					new BibleChapterValidator();

				const candidate =
					createCandidate();

				const result =
					validator.validate(
						candidate
					);

				expect(
					result
				).toEqual({
					version:
						'kjvs',

					chapterRef:
						'1_1',

					content:
						createChapterContent()
				});
			}
		);

		it(
			'preserves the candidate version and Chapter reference',
			() => {
				const validator =
					new BibleChapterValidator();

				const result =
					validator.validate(
						createCandidate({
							version:
								'kjv',

							chapterRef:
								'43_3',

							value:
								createChapterContent({
									number:
										3,

									bookName:
										'John'
								})
						})
					);

				expect(
					result.version
				).toBe(
					'kjv'
				);

				expect(
					result.chapterRef
				).toBe(
					'43_3'
				);
			}
		);

		it(
			'rejects non-object Chapter content',
			() => {
				const validator =
					new BibleChapterValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value:
									'not-a-chapter'
							})
						)
				).toThrow();
			}
		);

		it(
			'rejects a Chapter without a number',
			() => {
				const validator =
					new BibleChapterValidator();

				const {
					number: _,
					...value
				} =
					createChapterContent();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value
							})
						)
				).toThrow();
			}
		);

		it(
			'rejects a Chapter without a book name',
			() => {
				const validator =
					new BibleChapterValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value:
									createChapterContent({
										bookName:
											''
									})
							})
						)
				).toThrow();
			}
		);

		it(
			'rejects malformed Chapter references',
			() => {
				const validator =
					new BibleChapterValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								chapterRef:
									'1'
							})
						)
				).toThrow(
					'Invalid Bible Chapter reference: 1'
				);
			}
		);

		it(
			'rejects a Chapter reference whose Chapter number does not match the content',
			() => {
				const validator =
					new BibleChapterValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								chapterRef:
									'1_2'
							})
						)
				).toThrow(
					'Bible Chapter reference does not match Chapter number: 1_2'
				);
			}
		);

		it(
			'rejects invalid verse keys',
			() => {
				const validator =
					new BibleChapterValidator();

				const value =
					createChapterContent({
						verses: {
							'01':
								createVerse({
									number:
										1
								})
						}
					});

				expect(
					() =>
						validator.validate(
							createCandidate({
								value
							})
						)
				).toThrow(
					'Invalid Bible verse key: 01'
				);
			}
		);

		it(
			'rejects a verse key that does not match the verse number',
			() => {
				const validator =
					new BibleChapterValidator();

				const value =
					createChapterContent({
						verses: {
							'1':
								createVerse({
									number:
										2
								})
						}
					});

				expect(
					() =>
						validator.validate(
							createCandidate({
								value
							})
						)
				).toThrow(
					'Bible verse key does not match verse number: 1'
				);
			}
		);

		it(
			'rejects invalid Word content',
			() => {
				const validator =
					new BibleChapterValidator();

				const value =
					createChapterContent({
						verses: {
							'1': {
								number:
									1,

								text:
									'In the beginning',

								words: [
									{
										text:
											'In',

										class:
											null,

										href:
											null,

										emphasis:
											'false'
									}
								]
							}
						}
					});

				expect(
					() =>
						validator.validate(
							createCandidate({
								value
							})
						)
				).toThrow();
			}
		);

		it(
			'allows nullable Word class and href values',
			() => {
				const validator =
					new BibleChapterValidator();

				const result =
					validator.validate(
						createCandidate()
					);

				expect(
					result.content
						.verses['1']
						.words[0]
						.class
				).toBeNull();

				expect(
					result.content
						.verses['1']
						.words[0]
						.href
				).toBeNull();
			}
		);

		it(
			'does not include unsupported serialized fields in validated Chapter content',
			() => {
				const validator =
					new BibleChapterValidator();

				const result =
					validator.validate(
						createCandidate({
							value: {
								...createChapterContent(),

								blockElements: {}
							}
						})
					);

				expect(
					result.content
				).not.toHaveProperty(
					'blockElements'
				);
			}
		);
	}
);

function createCandidate(
	overrides:
		Partial<BibleChapterCandidate> =
			{}
): BibleChapterCandidate {
	return {
		version:
			'kjvs',

		chapterRef:
			'1_1',

		value:
			createChapterContent(),

		...overrides
	};
}

function createChapterContent(
	overrides:
		Record<string, unknown> =
			{}
): Record<string, unknown> {
	return {
		number:
			1,

		bookName:
			'Genesis',

		verses: {
			'1':
				createVerse()
		},

		verseMap: {
			'1':
				'1'
		},

		footnotes: {},

		...overrides
	};
}

function createVerse(
	overrides:
		Record<string, unknown> =
			{}
): Record<string, unknown> {
	return {
		number:
			1,

		words: [
			{
				text:
					'In',

				class:
					null,

				href:
					null,

				emphasis:
					false
			},
			{
				text:
					'beginning',

				class: [
					'xref'
				],

				href: [
					'H7225'
				],

				emphasis:
					false
			}
		],

		text:
			'1 In the beginning',

		...overrides
	};
}
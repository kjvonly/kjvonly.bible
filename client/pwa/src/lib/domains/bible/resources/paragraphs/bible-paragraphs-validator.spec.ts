import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleParagraphsCandidate
} from './bible-paragraphs-candidate';

import {
	BibleParagraphsValidator
} from './bible-paragraphs-validator';

describe(
	'BibleParagraphsValidator',
	() => {
		it(
			'validates Paragraph markers for a Chapter',
			() => {
				const validator =
					new BibleParagraphsValidator();

				const paragraphs = {
					'1_1_1_0': {},
					'1_1_6_0': {},
					'1_1_12_7': {}
				};

				const result =
					validator.validate(
						createCandidate({
							value:
								paragraphs
						})
					);

				expect(
					result
				).toEqual({
					source:
						'default',

					chapterRef:
						'1_1',

					paragraphs
				});
			}
		);

		it(
			'normalizes null Paragraph content to an empty map',
			() => {
				const validator =
					new BibleParagraphsValidator();

				expect(
					validator.validate(
						createCandidate({
							value:
								null
						})
					)
				).toEqual({
					source:
						'default',

					chapterRef:
						'1_1',

					paragraphs:
						{}
				});
			}
		);

		it(
			'preserves the candidate source',
			() => {
				const validator =
					new BibleParagraphsValidator();

				const result =
					validator.validate(
						createCandidate({
							source:
								'custom'
						})
					);

				expect(
					result.source
				).toBe(
					'custom'
				);
			}
		);

		it(
			'rejects non-object non-null Paragraph content',
			() => {
				const validator =
					new BibleParagraphsValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value:
									'not-paragraphs'
							})
						)
				).toThrow();
			}
		);

		it(
			'rejects a malformed Chapter reference',
			() => {
				const validator =
					new BibleParagraphsValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								chapterRef:
									'01_1'
							})
						)
				).toThrow(
					'Invalid Bible Paragraphs chapter reference: 01_1'
				);
			}
		);

		it(
			'rejects a malformed Paragraph marker reference',
			() => {
				const validator =
					new BibleParagraphsValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									'1_1_1': {}
								}
							})
						)
				).toThrow(
					'Invalid Bible Paragraph marker reference: 1_1_1'
				);
			}
		);

		it(
			'rejects a Paragraph marker belonging to another Chapter',
			() => {
				const validator =
					new BibleParagraphsValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									'1_2_1_0': {}
								}
							})
						)
				).toThrow(
					'Bible Paragraph marker does not belong to Chapter 1_1: 1_2_1_0'
				);
			}
		);

		it(
			'rejects a non-canonical marker number',
			() => {
				const validator =
					new BibleParagraphsValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									'1_1_01_0': {}
								}
							})
						)
				).toThrow(
					'Invalid Bible Paragraph marker reference: 1_1_01_0'
				);
			}
		);

		it(
			'allows a zero word index',
			() => {
				const validator =
					new BibleParagraphsValidator();

				expect(
					validator.validate(
						createCandidate({
							value: {
								'1_1_1_0': {}
							}
						})
					).paragraphs
				).toEqual({
					'1_1_1_0': {}
				});
			}
		);

		it(
			'rejects non-empty Paragraph marker values',
			() => {
				const validator =
					new BibleParagraphsValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									'1_1_1_0': {
										unexpected:
											true
									}
								}
							})
						)
				).toThrow();
			}
		);
	}
);

function createCandidate(
	overrides:
		Partial<BibleParagraphsCandidate> =
		{}
): BibleParagraphsCandidate {
	return {
		source:
			'default',

		chapterRef:
			'1_1',

		value: {
			'1_1_1_0': {}
		},

		...overrides
	};
}

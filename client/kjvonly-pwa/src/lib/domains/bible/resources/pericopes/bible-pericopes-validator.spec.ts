import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BiblePericopesCandidate
} from './bible-pericopes-candidate';

import {
	BiblePericopesValidator
} from './bible-pericopes-validator';

describe(
	'BiblePericopesValidator',
	() => {
		it(
			'validates Pericopes for a Chapter',
			() => {
				const validator =
					new BiblePericopesValidator();

				const pericopes = {
					'1_1_1': [
						createPericope(
							'1_1_1',
							'The Creation'
						)
					],
					'1_1_3': [
						createPericope(
							'1_1_3',
							'The First Day'
						)
					]
				};

				expect(
					validator.validate(
						createCandidate({
							value:
								pericopes
						})
					)
				).toEqual({
					source:
						'default',

					chapterRef:
						'1_1',

					pericopes
				});
			}
		);

		it(
			'accepts an empty Pericope map',
			() => {
				const validator =
					new BiblePericopesValidator();

				expect(
					validator.validate(
						createCandidate({
							value: {}
						})
					).pericopes
				).toEqual({});
			}
		);

		it(
			'preserves word formatting and href metadata',
			() => {
				const validator =
					new BiblePericopesValidator();

				const word = {
					text:
						'Lord',
					class: [
						'sc',
						'xref'
					],
					href: [
						'1_2_3'
					],
					emphasis:
						true
				};

				const result =
					validator.validate(
						createCandidate({
							value: {
								'1_1_1': [
									{
										text:
											'The Lord',
										ref:
											'1_1_1',
										words: [
											word
										]
									}
								]
							}
						})
					);

				expect(
					result.pericopes['1_1_1'][0].words[0]
				).toEqual(
					word
				);
			}
		);

		it(
			'rejects null Pericope content',
			() => {
				const validator =
					new BiblePericopesValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value:
									null
							})
						)
				).toThrow();
			}
		);

		it(
			'rejects a malformed Chapter reference',
			() => {
				const validator =
					new BiblePericopesValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								chapterRef:
									'01_1'
							})
						)
				).toThrow(
					'Invalid Bible Pericopes chapter reference: 01_1'
				);
			}
		);

		it(
			'rejects a malformed Verse key',
			() => {
				const validator =
					new BiblePericopesValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									'1_1': [
										createPericope(
											'1_1_1',
											'The Creation'
										)
									]
								}
							})
						)
				).toThrow(
					'Invalid Bible Pericope Verse reference: 1_1'
				);
			}
		);

		it(
			'rejects a Verse key belonging to another Chapter',
			() => {
				const validator =
					new BiblePericopesValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									'1_2_1': [
										createPericope(
											'1_2_1',
											'Another Chapter'
										)
									]
								}
							})
						)
				).toThrow(
					'Bible Pericope Verse does not belong to Chapter 1_1: 1_2_1'
				);
			}
		);

		it(
			'rejects a Pericope ref that does not match its Verse key',
			() => {
				const validator =
					new BiblePericopesValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									'1_1_1': [
										createPericope(
											'1_1_2',
											'The Creation'
										)
									]
								}
							})
						)
				).toThrow(
					'Bible Pericope ref does not match its Verse key: 1_1_2 !== 1_1_1'
				);
			}
		);

		it(
			'rejects malformed Pericope word data',
			() => {
				const validator =
					new BiblePericopesValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									'1_1_1': [
										{
											text:
												'The Creation',
											ref:
												'1_1_1',
											words: [
												{
													text:
														'The',
													class:
														null,
													href:
														null
												}
											]
										}
									]
								}
							})
						)
				).toThrow();
			}
		);

		it(
			'rejects a malformed word href',
			() => {
				const validator =
					new BiblePericopesValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									'1_1_1': [
										{
											...createPericope(
												'1_1_1',
												'The Creation'
											),
											words: [
												{
													text:
														'The',
													class:
														null,
													href: [
														'01_1_1'
													],
													emphasis:
														false
												}
											]
										}
									]
								}
							})
						)
				).toThrow(
					'Invalid Bible Pericope word href: 01_1_1'
				);
			}
		);
	}
);

function createCandidate(
	overrides:
		Partial<BiblePericopesCandidate> =
		{}
): BiblePericopesCandidate {
	return {
		source:
			'default',

		chapterRef:
			'1_1',

		value: {
			'1_1_1': [
				createPericope(
					'1_1_1',
					'The Creation'
				)
			]
		},

		...overrides
	};
}

function createPericope(
	ref: string,
	text: string
) {
	return {
		text,
		ref,
		words: [
			{
				text,
				class:
					null,
				href:
					null,
				emphasis:
					false
			}
		]
	};
}

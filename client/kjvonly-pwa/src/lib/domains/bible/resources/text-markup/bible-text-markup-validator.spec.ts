import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleTextMarkupCandidate
} from './bible-text-markup-candidate';

import {
	BibleTextMarkupValidator
} from './bible-text-markup-validator';

describe(
	'BibleTextMarkupValidator',
	() => {
		it(
			'validates verse and word Text Markup',
			() => {
				const validator =
					new BibleTextMarkupValidator();

				const markings = {
					'2': {
						'1': {
							class: [
								'bg-highlighta'
							]
						},
						'2': {
							class: [
								'bg-highlighta',
								'underline'
							]
						}
					}
				};

				expect(
					validator.validate(
						createCandidate({
							value:
								markings
						})
					)
				).toEqual({
					name:
						'kjvs',

					chapterRef:
						'1_3',

					markings
				});
			}
		);

		it(
			'allows an empty Text Markup map',
			() => {
				const validator =
					new BibleTextMarkupValidator();

				expect(
					validator.validate(
						createCandidate({
							value: {}
						})
					).markings
				).toEqual({});
			}
		);

		it(
			'allows word index zero',
			() => {
				const validator =
					new BibleTextMarkupValidator();

				expect(
					validator.validate(
						createCandidate({
							value: {
								'2': {
									'0': {
										class: [
											'bg-highlighta'
										]
									}
								}
							}
						})
					).markings
				).toEqual({
					'2': {
						'0': {
							class: [
								'bg-highlighta'
							]
						}
					}
				});
			}
		);

		it(
			'rejects a non-canonical verse',
			() => {
				const validator =
					new BibleTextMarkupValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									'02': {
										'1': {
											class: []
										}
									}
								}
							})
						)
				).toThrow(
					'Invalid Bible Text Markup verse: 02'
				);
			}
		);

		it(
			'rejects a non-canonical word index',
			() => {
				const validator =
					new BibleTextMarkupValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									'2': {
										'01': {
											class: []
										}
									}
								}
							})
						)
				).toThrow(
					'Invalid Bible Text Markup word index: 01'
				);
			}
		);

		it(
			'rejects a malformed Chapter reference',
			() => {
				const validator =
					new BibleTextMarkupValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								chapterRef:
									'01_3'
							})
						)
				).toThrow(
					'Invalid Bible Text Markup chapter reference: 01_3'
				);
			}
		);

		it(
			'rejects malformed marking content',
			() => {
				const validator =
					new BibleTextMarkupValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									'2': {
										'1': {
											class:
												'bg-highlighta'
										}
									}
								}
							})
						)
				).toThrow();
			}
		);

		it(
			'rejects unexpected marking properties',
			() => {
				const validator =
					new BibleTextMarkupValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									'2': {
										'1': {
											class: [],
											unexpected:
												true
										}
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
		Partial<BibleTextMarkupCandidate> =
		{}
): BibleTextMarkupCandidate {
	return {
		name:
			'kjvs',

		chapterRef:
			'1_3',

		value: {},

		...overrides
	};
}

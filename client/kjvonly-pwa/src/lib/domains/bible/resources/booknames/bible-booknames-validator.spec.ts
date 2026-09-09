import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleBooknamesContent
} from '$lib/domains/bible/models/bible-booknames.model';

import type {
	BibleBooknamesCandidate
} from './bible-booknames-candidate';

import {
	BibleBooknamesValidator
} from './bible-booknames-validator';

describe(
	'BibleBooknamesValidator',
	() => {
		it(
			'validates Bible Booknames content',
			() => {
				const validator =
					new BibleBooknamesValidator();

				const content =
					createBooknamesContent();

				const result =
					validator.validate(
						createCandidate({
							value:
								content
						})
					);

				expect(
					result
				).toEqual({
					key:
						'default',

					content
				});
			}
		);

		it(
			'preserves the candidate key',
			() => {
				const validator =
					new BibleBooknamesValidator();

				const result =
					validator.validate(
						createCandidate({
							key:
								'custom'
						})
					);

				expect(
					result.key
				).toBe(
					'custom'
				);
			}
		);

		it(
			'rejects non-object Bible Booknames content',
			() => {
				const validator =
					new BibleBooknamesValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value:
									'not-booknames'
							})
						)
				).toThrow();
			}
		);

		it(
			'rejects content missing a required map',
			() => {
				const validator =
					new BibleBooknamesValidator();

				const {
					shortNames: _,
					...value
				} =
					createBooknamesContent();

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
			'rejects a non-canonical book id',
			() => {
				const validator =
					new BibleBooknamesValidator();

				const base =
					createBooknamesContent();

				const value:
					BibleBooknamesContent = {
						...base,

						booknamesById: {
							...base.booknamesById,
							'01':
								'Invalid'
						},

						booknamesByName: {
							...base.booknamesByName,
							Invalid:
								1
						},

						shortNames: {
							...base.shortNames,
							'01':
								'Inv'
						},

						maxChapterById: {
							...base.maxChapterById,
							'01':
								1
						},

						bookchapterversecountById: {
							...base.bookchapterversecountById,
							'01': {
								'1':
									1
							}
						}
					};

				expect(
					() =>
						validator.validate(
							createCandidate({
								value
							})
						)
				).toThrow(
					'Invalid Bible Booknames book id: 01'
				);
			}
		);

		it(
			'rejects a book map whose keys do not match booknamesById',
			() => {
				const validator =
					new BibleBooknamesValidator();

				const value =
					createBooknamesContent();

				delete value.shortNames['2'];

				expect(
					() =>
						validator.validate(
							createCandidate({
								value
							})
						)
				).toThrow(
					'Bible Booknames shortNames keys do not match booknamesById.'
				);
			}
		);

		it(
			'rejects a mismatched book name inverse',
			() => {
				const validator =
					new BibleBooknamesValidator();

				const value =
					createBooknamesContent();

				value.booknamesByName.Genesis =
					2;

				expect(
					() =>
						validator.validate(
							createCandidate({
								value
							})
						)
				).toThrow(
					'Bible Booknames inverse mapping does not match for book id 1.'
				);
			}
		);

		it(
			'rejects duplicate short names',
			() => {
				const validator =
					new BibleBooknamesValidator();

				const value =
					createBooknamesContent();

				value.shortNames['2'] =
					'Gen';

				expect(
					() =>
						validator.validate(
							createCandidate({
								value
							})
						)
				).toThrow(
					'Duplicate Bible Booknames short name: Gen'
				);
			}
		);

		it(
			'rejects a chapter count that does not match maxChapterById',
			() => {
				const validator =
					new BibleBooknamesValidator();

				const value =
					createBooknamesContent();

				value.maxChapterById['1'] =
					3;

				expect(
					() =>
						validator.validate(
							createCandidate({
								value
							})
						)
				).toThrow(
					'Bible Booknames chapter count does not match maxChapterById for book id 1.'
				);
			}
		);

		it(
			'rejects a non-canonical chapter key',
			() => {
				const validator =
					new BibleBooknamesValidator();

				const value =
					createBooknamesContent();

				value.bookchapterversecountById['2'] = {
					'01':
						22
				};

				value.maxChapterById['2'] =
					1;

				expect(
					() =>
						validator.validate(
							createCandidate({
								value
							})
						)
				).toThrow(
					'Invalid Bible Booknames chapter key 01 for book id 2.'
				);
			}
		);
	}
);

function createCandidate(
	overrides:
		Partial<BibleBooknamesCandidate> =
		{}
): BibleBooknamesCandidate {
	return {
		key:
			'default',

		value:
			createBooknamesContent(),

		...overrides
	};
}

function createBooknamesContent():
	BibleBooknamesContent {
	return {
		booknamesById: {
			'1':
				'Genesis',

			'2':
				'Exodus'
		},

		booknamesByName: {
			Genesis:
				1,

			Exodus:
				2
		},

		shortNames: {
			'1':
				'Gen',

			'2':
				'Exo'
		},

		maxChapterById: {
			'1':
				2,

			'2':
				1
		},

		bookchapterversecountById: {
			'1': {
				'1':
					31,

				'2':
					25
			},

			'2': {
				'1':
					22
			}
		}
	};
}

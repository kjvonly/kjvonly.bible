import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	BibleSearchIndexCandidate
} from './bible-search-index-candidate';

import {
	BibleSearchIndexValidator
} from './bible-search-index-validator';

describe(
	'BibleSearchIndexValidator',
	() => {
		it(
			'validates and preserves a FlexSearch Index export',
			() => {
				const validator =
					new BibleSearchIndexValidator();

				const chunks =
					createChunks();

				expect(
					validator.validate({
						version:
							'kjvs',

						value:
							chunks
					})
				).toEqual({
					version:
						'kjvs',

					chunks
				});
			}
		);

		it(
			'preserves additional string chunks instead of stripping export data',
			() => {
				const validator =
					new BibleSearchIndexValidator();

				const result =
					validator.validate(
						createCandidate({
							value: {
								...createChunks(),
								future:
									'{"value":1}'
							}
						})
					);

				expect(
					result.chunks.future
				).toBe(
					'{"value":1}'
				);
			}
		);

		it(
			'rejects non-object content',
			() => {
				const validator =
					new BibleSearchIndexValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value:
									'not-an-index'
							})
						)
				).toThrow(
					'Bible Search Index content must be an object.'
				);
			}
		);

		it(
			'rejects a missing required FlexSearch chunk',
			() => {
				const validator =
					new BibleSearchIndexValidator();

				const {
					ctx: _,
					...value
				} =
					createChunks();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value
							})
						)
				).toThrow(
					'Bible Search Index is missing required FlexSearch chunk: ctx'
				);
			}
		);

		it(
			'rejects a non-string FlexSearch chunk',
			() => {
				const validator =
					new BibleSearchIndexValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									...createChunks(),
									map:
										[]
								}
							})
						)
				).toThrow(
					'Bible Search Index chunk map must be a string.'
				);
			}
		);

		it(
			'rejects a chunk that is not valid JSON',
			() => {
				const validator =
					new BibleSearchIndexValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									...createChunks(),
									ctx:
										'not-json'
								}
							})
						)
				).toThrow(
					'Bible Search Index FlexSearch chunk ctx must contain valid JSON.'
				);
			}
		);

		it(
			'rejects a Document export configuration',
			() => {
				const validator =
					new BibleSearchIndexValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									...createChunks(),
									cfg:
										'{"doc":1,"opt":1}'
								}
							})
						)
				).toThrow(
					'Bible Search Index cfg chunk is not a supported FlexSearch Index configuration.'
				);
			}
		);

		it(
			'rejects an unsupported optimize value',
			() => {
				const validator =
					new BibleSearchIndexValidator();

				expect(
					() =>
						validator.validate(
							createCandidate({
								value: {
									...createChunks(),
									cfg:
										'{"doc":0,"opt":2}'
								}
							})
						)
				).toThrow(
					'Bible Search Index cfg chunk is not a supported FlexSearch Index configuration.'
				);
			}
		);
	}
);

function createCandidate(
	overrides:
		Partial<BibleSearchIndexCandidate> =
		{}
): BibleSearchIndexCandidate {
	return {
		version:
			'kjvs',

		value:
			createChunks(),

		...overrides
	};
}

function createChunks() {
	return {
		reg:
			'{}',

		cfg:
			'{"doc":0,"opt":1}',

		map:
			'[]',

		ctx:
			'[]'
	};
}

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createBibleVersionId,
	createChapterId
} from './bible-identity';

describe(
	'createBibleVersionId',
	() => {
		it(
			'creates a publisher-scoped Bible Version id',
			() => {
				const result =
					createBibleVersionId(
						'abc123',
						'kjvs'
					);

				expect(
					result
				).toBe(
					'abc123/kjvs'
				);
			}
		);

		it(
			'creates different ids for different publishers',
			() => {
				const publisherA =
					createBibleVersionId(
						'publisher-a',
						'kjvs'
					);

				const publisherB =
					createBibleVersionId(
						'publisher-b',
						'kjvs'
					);

				expect(
					publisherA
				).not.toBe(
					publisherB
				);
			}
		);

		it(
			'creates different ids for different Bible versions',
			() => {
				const kjv =
					createBibleVersionId(
						'abc123',
						'kjv'
					);

				const kjvs =
					createBibleVersionId(
						'abc123',
						'kjvs'
					);

				expect(
					kjv
				).not.toBe(
					kjvs
				);
			}
		);
	}
);

describe(
	'createChapterId',
	() => {
		it(
			'creates a publisher-scoped Chapter id',
			() => {
				const result =
					createChapterId(
						'abc123',
						'kjvs',
						'1_1'
					);

				expect(
					result
				).toBe(
					'abc123/kjvs/1_1'
				);
			}
		);

		it(
			'builds Chapter identity from Bible Version identity',
			() => {
				const bibleVersionId =
					createBibleVersionId(
						'abc123',
						'kjvs'
					);

				const chapterId =
					createChapterId(
						'abc123',
						'kjvs',
						'1_1'
					);

				expect(
					chapterId
				).toBe(
					`${bibleVersionId}/1_1`
				);
			}
		);

		it(
			'creates different ids for different Chapters',
			() => {
				const genesis1 =
					createChapterId(
						'abc123',
						'kjvs',
						'1_1'
					);

				const genesis2 =
					createChapterId(
						'abc123',
						'kjvs',
						'1_2'
					);

				expect(
					genesis1
				).not.toBe(
					genesis2
				);
			}
		);

		it(
			'creates different Chapter ids for different publishers',
			() => {
				const publisherA =
					createChapterId(
						'publisher-a',
						'kjvs',
						'1_1'
					);

				const publisherB =
					createChapterId(
						'publisher-b',
						'kjvs',
						'1_1'
					);

				expect(
					publisherA
				).not.toBe(
					publisherB
				);
			}
		);

		it(
			'creates different Chapter ids for different Bible versions',
			() => {
				const kjv =
					createChapterId(
						'abc123',
						'kjv',
						'1_1'
					);

				const kjvs =
					createChapterId(
						'abc123',
						'kjvs',
						'1_1'
					);

				expect(
					kjv
				).not.toBe(
					kjvs
				);
			}
		);
	}
);
import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createBibleVersionId,
	createChapterId,
	extractBibleVersion,
	extractBibleVersionPublisher,
	parseBibleVersionId
} from './bible-identity';

describe(
	'createBibleVersionId',
	() => {
		it(
			'creates a publisher-scoped Bible Version id',
			() => {
				expect(
					createBibleVersionId(
						'abc123',
						'kjvs'
					)
				).toBe(
					'abc123/kjvs'
				);
			}
		);

		it(
			'creates different ids for different publishers',
			() => {
				expect(
					createBibleVersionId(
						'publisher-a',
						'kjvs'
					)
				).not.toBe(
					createBibleVersionId(
						'publisher-b',
						'kjvs'
					)
				);
			}
		);

		it(
			'creates different ids for different Bible versions',
			() => {
				expect(
					createBibleVersionId(
						'abc123',
						'kjv'
					)
				).not.toBe(
					createBibleVersionId(
						'abc123',
						'kjvs'
					)
				);
			}
		);
	}
);

describe(
	'parseBibleVersionId',
	() => {
		it(
			'extracts publisher and version',
			() => {
				expect(
					parseBibleVersionId(
						'abc123/kjvs'
					)
				).toEqual({
					publisher:
						'abc123',

					version:
						'kjvs'
				});
			}
		);

		it(
			'rejects a bare version',
			() => {
				expect(
					() =>
						parseBibleVersionId(
							'kjvs'
						)
				).toThrow(
					'Invalid Bible Version id'
				);
			}
		);

		it(
			'rejects too many segments',
			() => {
				expect(
					() =>
						parseBibleVersionId(
							'publisher/kjvs/extra'
						)
				).toThrow(
					'Invalid Bible Version id'
				);
			}
		);
	}
);

describe(
	'extractBibleVersion',
	() => {
		it(
			'extracts the Bible version from a Bible Version id',
			() => {
				expect(
					extractBibleVersion(
						'abc123/kjvs'
					)
				).toBe(
					'kjvs'
				);
			}
		);

		it(
			'rejects an invalid Bible Version id',
			() => {
				expect(
					() =>
						extractBibleVersion(
							'kjvs'
						)
				).toThrow(
					'Invalid Bible Version id'
				);
			}
		);
	}
);

describe(
	'extractBibleVersionPublisher',
	() => {
		it(
			'extracts the publisher from a Bible Version id',
			() => {
				expect(
					extractBibleVersionPublisher(
						'abc123/kjvs'
					)
				).toBe(
					'abc123'
				);
			}
		);

		it(
			'rejects an invalid Bible Version id',
			() => {
				expect(
					() =>
						extractBibleVersionPublisher(
							'kjvs'
						)
				).toThrow(
					'Invalid Bible Version id'
				);
			}
		);
	}
);

describe(
	'createChapterId',
	() => {
		it(
			'creates Chapter identity from Bible Version identity',
			() => {
				const bibleVersionId =
					createBibleVersionId(
						'abc123',
						'kjvs'
					);

				expect(
					createChapterId(
						bibleVersionId,
						'1_1'
					)
				).toBe(
					'abc123/kjvs/1_1'
				);
			}
		);

		it(
			'creates different ids for different Chapters',
			() => {
				const bibleVersionId =
					createBibleVersionId(
						'abc123',
						'kjvs'
					);

				expect(
					createChapterId(
						bibleVersionId,
						'1_1'
					)
				).not.toBe(
					createChapterId(
						bibleVersionId,
						'1_2'
					)
				);
			}
		);

		it(
			'creates different Chapter ids for different Bible versions',
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
					createChapterId(
						kjv,
						'1_1'
					)
				).not.toBe(
					createChapterId(
						kjvs,
						'1_1'
					)
				);
			}
		);

		it(
			'creates different Chapter ids for different publishers',
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
					createChapterId(
						publisherA,
						'1_1'
					)
				).not.toBe(
					createChapterId(
						publisherB,
						'1_1'
					)
				);
			}
		);
	}
);
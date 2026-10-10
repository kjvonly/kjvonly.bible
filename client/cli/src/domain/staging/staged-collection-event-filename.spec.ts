import {
	describe,
	expect,
	it
} from 'vitest';

import {
	buildStagedCollectionEventFilename,
	parseStagedCollectionEventFilename
} from './staged-collection-event-filename.js';


const inputRevision =
	'b'.repeat(
		32
	);


const eventId =
	'a'.repeat(
		64
	);


describe(
	'staged collection event filename',
	() => {
		it(
			'round trips current collection staging metadata',
			() => {
				const metadata = {
					collectionName:
						'application-defaults',

					inputRevision,

					createdAt:
						1000,

					eventId
				};


				const filename =
					buildStagedCollectionEventFilename(
						metadata
					);


				expect(
					filename
				).toBe(
					`application-defaults--${inputRevision}--1000--${eventId}.v2.json`
				);


				expect(
					parseStagedCollectionEventFilename(
						filename
					)
				).toEqual(
					metadata
				);
			}
		);


		it(
			'parses legacy collection staging metadata without an input revision',
			() => {
				expect(
					parseStagedCollectionEventFilename(
						`application-defaults--1000--${eventId}.json`
					)
				).toEqual({
					collectionName:
						'application-defaults',
					createdAt:
						1000,
					eventId
				});
			}
		);


		it(
			'keeps revision-like suffixes inside legacy collection names',
			() => {
				const collectionName =
					`legacy--${inputRevision}`;


				expect(
					parseStagedCollectionEventFilename(
						`${collectionName}--1000--${eventId}.json`
					)
				).toEqual({
					collectionName,
					createdAt:
						1000,
					eventId
				});
			}
		);


		it(
			'supports -- inside collection names',
			() => {
				const filename =
					buildStagedCollectionEventFilename({
						collectionName:
							'application--defaults',
						inputRevision,
						createdAt:
							1000,
						eventId
					});


				expect(
					parseStagedCollectionEventFilename(
						filename
					).collectionName
				).toBe(
					'application--defaults'
				);
			}
		);


		it(
			'accepts a 128-byte collection name',
			() => {
				expect(
					() =>
						buildStagedCollectionEventFilename({
							collectionName:
								'a'.repeat(
									128
								),
							inputRevision,
							createdAt:
								1000,
							eventId
						})
				).not.toThrow();
			}
		);


		it(
			'rejects a collection name longer than 128 bytes',
			() => {
				expect(
					() =>
						buildStagedCollectionEventFilename({
							collectionName:
								'a'.repeat(
									129
								),
							inputRevision,
							createdAt:
								1000,
							eventId
						})
				).toThrow(
					'Collection name exceeds 128 UTF-8 bytes.'
				);
			}
		);


		it(
			'measures collection name length in UTF-8 bytes',
			() => {
				const build =
					(
						collectionName:
							string
					) =>
						buildStagedCollectionEventFilename({
							collectionName,
							inputRevision,
							createdAt:
								1000,
							eventId
						});


				expect(
					() =>
						build(
							'é'.repeat(
								64
							)
						)
				).not.toThrow();


				expect(
					() =>
						build(
							'é'.repeat(
								65
							)
						)
				).toThrow(
					'Collection name exceeds 128 UTF-8 bytes.'
				);
			}
		);


		it(
			'rejects an invalid input revision',
			() => {
				expect(
					() =>
						buildStagedCollectionEventFilename({
							collectionName:
								'application-defaults',
							inputRevision:
								'invalid',
							createdAt:
								1000,
							eventId
						})
				).toThrow(
					'Invalid Collection input revision.'
				);
			}
		);
	}
);

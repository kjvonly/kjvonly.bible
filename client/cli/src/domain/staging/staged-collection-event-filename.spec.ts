import {
	describe,
	expect,
	it
} from 'vitest';

import {
	buildStagedCollectionEventFilename,
	parseStagedCollectionEventFilename
} from './staged-collection-event-filename.js';


describe(
	'staged collection event filename',
	() => {

		it(
			'round trips collection staging metadata',
			() => {

				const metadata = {
					collectionName:
						'application-defaults',

					createdAt:
						1000,

					eventId:
						'a'.repeat(
							64
						)
				};


				const filename =
					buildStagedCollectionEventFilename(
						metadata
					);


				expect(
					filename
				).toBe(
					`application-defaults--1000--${'a'.repeat(64)}.json`
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
			'supports -- inside collection names',
			() => {

				const filename =
					buildStagedCollectionEventFilename({
						collectionName:
							'application--defaults',

						createdAt:
							1000,

						eventId:
							'a'.repeat(
								64
							)
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

							createdAt:
								1000,

							eventId:
								'a'.repeat(
									64
								)
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

							createdAt:
								1000,

							eventId:
								'a'.repeat(
									64
								)
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

							createdAt:
								1000,

							eventId:
								'a'.repeat(
									64
								)
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
	}
);
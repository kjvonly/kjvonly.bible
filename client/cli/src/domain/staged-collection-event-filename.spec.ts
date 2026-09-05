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
	}
);
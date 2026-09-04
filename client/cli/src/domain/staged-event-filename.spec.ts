import {
	describe,
	expect,
	it
} from 'vitest';

import {
	buildStagedEventFilename,
	parseStagedEventFilename
} from './staged-event-filename.js';


describe(
	'staged event filename',
	() => {

		it(
			'round trips staged event metadata',
			() => {

				const metadata = {
					key:
						'1_1',

					sourceMtimeMs:
						1788461234123,

					sourceSize:
						18453,

					definitionRevision:
						'71a3cbd1',

					eventId:
						'a'.repeat(
							64
						)
				};


				const filename =
					buildStagedEventFilename(
						metadata
					);


				expect(
					filename
				).toBe(
					`1_1--1788461234123--18453--71a3cbd1--${'a'.repeat(64)}.json`
				);


				expect(
					parseStagedEventFilename(
						filename
					)
				).toEqual(
					metadata
				);
			}
		);


		it(
			'supports -- inside the key',
			() => {

				const filename =
					buildStagedEventFilename({
						key:
							'chapter--1_1',

						sourceMtimeMs:
							100,

						sourceSize:
							200,

						definitionRevision:
							'12345678',

						eventId:
							'b'.repeat(
								64
							)
					});


				expect(
					parseStagedEventFilename(
						filename
					).key
				).toBe(
					'chapter--1_1'
				);
			}
		);


		it(
			'rejects malformed filenames',
			() => {

				expect(
					() =>
						parseStagedEventFilename(
							'1_1--event.json'
						)
				).toThrow(
					'Malformed staged event filename'
				);
			}
		);
	}
);
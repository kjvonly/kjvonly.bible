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

					createdAt:
						1788461240,

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
					`1_1--1788461234123--18453--71a3cbd1--1788461240--${'a'.repeat(64)}.json`
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

						createdAt:
							1000,

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

		it(
			'accepts a 128-byte key',
			() => {

				expect(
					() =>
						buildStagedEventFilename({
							key:
								'a'.repeat(
									128
								),

							sourceMtimeMs:
								100,

							sourceSize:
								200,

							definitionRevision:
								'12345678',

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
			'rejects a key longer than 128 bytes',
			() => {

				expect(
					() =>
						buildStagedEventFilename({
							key:
								'a'.repeat(
									129
								),

							sourceMtimeMs:
								100,

							sourceSize:
								200,

							definitionRevision:
								'12345678',

							createdAt:
								1000,

							eventId:
								'a'.repeat(
									64
								)
						})
				).toThrow(
					'Staged event key exceeds 128 UTF-8 bytes.'
				);
			}
		);

		it(
			'measures key length in UTF-8 bytes',
			() => {

				const build =
					(
						key:
							string
					) =>
						buildStagedEventFilename({
							key,

							sourceMtimeMs:
								100,

							sourceSize:
								200,

							definitionRevision:
								'12345678',

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
					'Staged event key exceeds 128 UTF-8 bytes.'
				);
			}
		);

		it(
			'accepts a 255-byte filename',
			() => {

				const filename =
					buildStagedEventFilename({
						key:
							'a'.repeat(
								123
							),

						sourceMtimeMs:
							999_999_999_999_999,

						sourceSize:
							999_999_999_999_999,

						definitionRevision:
							'12345678',

						createdAt:
							999_999_999_999_999,

						eventId:
							'a'.repeat(
								64
							)
					});


				expect(
					Buffer.byteLength(
						filename,
						'utf8'
					)
				).toBe(
					255
				);
			}
		);

		it(
			'rejects a filename longer than 255 bytes',
			() => {

				expect(
					() =>
						buildStagedEventFilename({
							key:
								'a'.repeat(
									124
								),

							sourceMtimeMs:
								999_999_999_999_999,

							sourceSize:
								999_999_999_999_999,

							definitionRevision:
								'12345678',

							createdAt:
								999_999_999_999_999,

							eventId:
								'a'.repeat(
									64
								)
						})
				).toThrow(
					'Staged event filename exceeds 255 UTF-8 bytes.'
				);
			}
		);
	}
);
import {
	describe,
	expect,
	it
} from 'vitest';

import {
	buildStagedArtifactFilename,
	parseStagedArtifactFilename
} from './staged-artifact-filename.js';


describe(
	'staged artifact filename',
	() => {

		it(
			'round trips staged artifact metadata',
			() => {

				const metadata = {
					key:
						'kjvs',

					sourceMtimeMs:
						1788461234123,

					sourceSize:
						4800000,

					artifactRevision:
						'34be4c21',

					sha256:
						'a'.repeat(
							64
						),

					extension:
						'.json.gz'
				};


				const filename =
					buildStagedArtifactFilename(
						metadata
					);


				expect(
					filename
				).toBe(
					`kjvs--1788461234123--4800000--34be4c21--${'a'.repeat(64)}.json.gz`
				);


				expect(
					parseStagedArtifactFilename(
						filename
					)
				).toEqual(
					metadata
				);
			}
		);


		it(
			'supports keys containing --',
			() => {

				const filename =
					buildStagedArtifactFilename({
						key:
							'bundle--default',

						sourceMtimeMs:
							100,

						sourceSize:
							200,

						artifactRevision:
							'12345678',

						sha256:
							'b'.repeat(
								64
							),

						extension:
							'.json.gz'
					});


				expect(
					parseStagedArtifactFilename(
						filename
					).key
				).toBe(
					'bundle--default'
				);
			}
		);


		it(
			'rejects malformed filenames',
			() => {

				expect(
					() =>
						parseStagedArtifactFilename(
							'broken.json'
						)
				).toThrow(
					'Malformed staged artifact filename'
				);
			}
		);
	}
);
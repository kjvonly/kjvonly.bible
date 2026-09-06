import {
	describe,
	expect,
	it
} from 'vitest';

import {
	calculateArtifactDefinitionRevision
} from './artifact-definition-revision.js';


describe(
	'calculateArtifactDefinitionRevision',
	() => {

		it(
			'is stable for the same encoding',
			() => {

				const first =
					calculateArtifactDefinitionRevision({
						mediaType:
							'application/json',

						encoding: [
							'gzip'
						],

						strategy:
							'primary'
					});


				const second =
					calculateArtifactDefinitionRevision({
						mediaType:
							'application/octet-stream',

						encoding: [
							'gzip'
						],

						strategy:
							'archive'
					});


				expect(
					second
				).toBe(
					first
				);
			}
		);


		it(
			'changes when object encoding changes',
			() => {

				const identity =
					calculateArtifactDefinitionRevision({
						mediaType:
							'application/json',

						encoding:
							[]
					});


				const gzip =
					calculateArtifactDefinitionRevision({
						mediaType:
							'application/json',

						encoding: [
							'gzip'
						]
					});


				expect(
					gzip
				).not.toBe(
					identity
				);
			}
		);
	}
);
import {
	describe,
	expect,
	it
} from 'vitest';

import type {
	PublicationResult
} from './publication-result.js';


describe(
	'PublicationResult',
	() => {

		it(
			'carries implementation-specific publication data',
			() => {

				const data = {
					url:
						'https://blossom.example',

					status:
						'uploaded'
				};


				const result:
					PublicationResult = {
						type:
							'blossom',

						data
					};


				expect(
					result.type
				).toBe(
					'blossom'
				);


				expect(
					result.data
				).toBe(
					data
				);
			}
		);
	}
);
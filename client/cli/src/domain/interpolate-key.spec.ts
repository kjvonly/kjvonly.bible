import {
	describe,
	expect,
	it
} from 'vitest';

import {
	interpolateEventKey,
	interpolateKey
} from './interpolate-key.js';


describe(
	'interpolateKey',
	() => {

		it(
			'interpolates a key',
			() => {

				expect(
					interpolateKey(
						'kjvonly/chapters/${key}',
						'1_1'
					)
				).toBe(
					'kjvonly/chapters/1_1'
				);
			}
		);


		it(
			'interpolates multiple occurrences',
			() => {

				expect(
					interpolateKey(
						'${key}/${key}',
						'1_1'
					)
				).toBe(
					'1_1/1_1'
				);
			}
		);


		it(
			'leaves values without key interpolation unchanged',
			() => {

				expect(
					interpolateKey(
						'application/json+hex',
						'1_1'
					)
				).toBe(
					'application/json+hex'
				);
			}
		);
	}
);


describe(
	'interpolateEventKey',
	() => {

		it(
			'interpolates event tags',
			() => {

				const event =
					interpolateEventKey(
						{
							encoding: [
								'hex'
							],

							tags: [
								[
									'd',
									'kjvonly/chapters/${key}'
								],
								[
									't',
									'kjvonly/chapters'
								]
							]
						},
						'1_1'
					);


				expect(
					event.tags
				).toEqual([
					[
						'd',
						'kjvonly/chapters/1_1'
					],
					[
						't',
						'kjvonly/chapters'
					]
				]);
			}
		);
	}
);
import {
	describe,
	expect,
	it
} from 'vitest';

import {
	deriveSourceKey
} from './source-key.js';


describe(
	'deriveSourceKey',
	() => {

		it.each([
			[
				'1_1.json.gz',
				'1_1'
			],
			[
				'H7225.json.gz',
				'H7225'
			],
			[
				'sermon-001.mp3',
				'sermon-001'
			],
			[
				'plain',
				'plain'
			]
		])(
			'derives %s as %s',
			(
				filename,
				expected
			) => {

				expect(
					deriveSourceKey(
						filename
					)
				).toBe(
					expected
				);
			}
		);
	}
);
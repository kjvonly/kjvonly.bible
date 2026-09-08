import {
	describe,
	expect,
	it
} from 'vitest';

import {
	deriveSourceExtension
} from './source-extension.js';


describe(
	'deriveSourceExtension',
	() => {

		it.each([
			[
				'kjvs.json.gz',
				'.json.gz'
			],
			[
				'sermon.mp3',
				'.mp3'
			],
			[
				'archive',
				''
			]
		])(
			'derives %s as %s',
			(
				filename,
				expected
			) => {

				expect(
					deriveSourceExtension(
						filename
					)
				).toBe(
					expected
				);
			}
		);
	}
);
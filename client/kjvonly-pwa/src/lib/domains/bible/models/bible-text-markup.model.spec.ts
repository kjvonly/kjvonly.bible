import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createBibleTextMarkupId
} from './bible-text-markup.model';

describe(
	'createBibleTextMarkupId',
	() => {
		it(
			'creates the application object id from publisher, name, and Chapter',
			() => {
				expect(
					createBibleTextMarkupId(
						'publisher',
						'kjvs',
						'1_3'
					)
				).toBe(
					'publisher/kjvs/1_3'
				);
			}
		);
	}
);

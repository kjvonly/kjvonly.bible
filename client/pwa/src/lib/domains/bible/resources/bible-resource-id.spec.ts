import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createBibleResourceId,
	parseBibleResourceId
} from './bible-resource-id';

describe(
	'Bible Resource ID',
	() => {
		it(
			'keeps Resource ID separate from Resource Type',
			() => {
				expect(
					createBibleResourceId(
						'chapter',
						'kjvs',
						'1_1'
					)
				).toBe(
					'kjvonly/bible/chapter/kjvs/1_1'
				);
			}
		);

		it(
			'rejects the historical plural Chapter identity grammar',
			() => {
				expect(
					() =>
						parseBibleResourceId(
							'kjvonly/bible/chapters/kjvs/1_1',
							'chapter',
							[1, 2],
							'Chapter'
						)
				).toThrow(
					'Invalid Bible Chapter Resource ID'
				);
			}
		);
	}
);

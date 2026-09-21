import {
	describe,
	expect,
	it
} from 'vitest';

import {
	filterBibleLocationRefsByBookID
} from './strongs-search';

describe(
	'filterBibleLocationRefsByBookID',
	() => {
		it(
			'keeps only references from the requested book',
			() => {
				expect(
					filterBibleLocationRefsByBookID(
						[
							'1_1_1',
							'1_2_3',
							'2_1_1',
							'10_1_1'
						],
						1
					)
				).toEqual([
					'1_1_1',
					'1_2_3'
				]);
			}
		);
	}
);

import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createStrongsId
} from './strongs-identity';

describe(
	'createStrongsId',
	() => {
		it(
			'creates Strong\'s identity from Bible Version identity',
			() => {
				expect(
					createStrongsId(
						'publisher/kjvs',
						'G1'
					)
				).toBe(
					'publisher/kjvs/G1'
				);
			}
		);

		it(
			'creates different ids for different Strong\'s keys',
			() => {
				expect(
					createStrongsId(
						'publisher/kjvs',
						'G1'
					)
				).not.toBe(
					createStrongsId(
						'publisher/kjvs',
						'G2'
					)
				);
			}
		);

		it(
			'creates different ids for different Bible versions',
			() => {
				expect(
					createStrongsId(
						'publisher/kjv',
						'G1'
					)
				).not.toBe(
					createStrongsId(
						'publisher/kjvs',
						'G1'
					)
				);
			}
		);

		it(
			'creates different ids for different publishers',
			() => {
				expect(
					createStrongsId(
						'publisher-a/kjvs',
						'G1'
					)
				).not.toBe(
					createStrongsId(
						'publisher-b/kjvs',
						'G1'
					)
				);
			}
		);

		it(
			'supports Hebrew Strong\'s keys',
			() => {
				expect(
					createStrongsId(
						'publisher/kjvs',
						'H1'
					)
				).toBe(
					'publisher/kjvs/H1'
				);
			}
		);
	}
);
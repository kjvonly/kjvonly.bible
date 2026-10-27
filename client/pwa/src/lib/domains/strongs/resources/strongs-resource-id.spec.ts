import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createStrongsResourceId,
	parseStrongsResourceId
} from './strongs-resource-id';

describe(
	"Strong's Resource ID",
	() => {
		it(
			'keeps Resource ID separate from Resource Type',
			() => {
				expect(
					createStrongsResourceId(
						'kjvs',
						'G1'
					)
				).toBe(
					'kjvonly/strongs/definition/kjvs/G1'
				);
			}
		);

		it(
			'rejects the historical plural definition identity grammar',
			() => {
				expect(
					() =>
						parseStrongsResourceId(
							'kjvonly/strongs/definitions/kjvs/G1'
						)
				).toThrow(
					"Invalid Strong's Resource ID"
				);
			}
		);
	}
);

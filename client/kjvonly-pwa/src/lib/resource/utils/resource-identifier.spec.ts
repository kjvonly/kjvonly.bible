import {
	describe,
	expect,
	it
} from 'vitest';

import {
	extractResourcePath,
	extractResourceType,
	parseResourceIdentifier
} from './resource-identifier';

describe(
	'parseResourceIdentifier',
	() => {
		it(
			'parses Resource Type and path',
			() => {
				const result =
					parseResourceIdentifier(
						'kjvonly/bible/chapters/kjvs/1_1'
					);

				expect(
					result
				).toEqual({
					resourceType:
						'kjvonly/bible/chapters',

					path: [
						'kjvs',
						'1_1'
					]
				});
			}
		);

		it(
			'allows a Resource Type root with an empty path',
			() => {
				const result =
					parseResourceIdentifier(
						'kjvonly/bible/chapters'
					);

				expect(
					result
				).toEqual({
					resourceType:
						'kjvonly/bible/chapters',

					path: []
				});
			}
		);

		it(
			'preserves additional Resource path segments',
			() => {
				const result =
					parseResourceIdentifier(
						'kjvonly/plans/readings/yearly/2026/default'
					);

				expect(
					result
				).toEqual({
					resourceType:
						'kjvonly/plans/readings',

					path: [
						'yearly',
						'2026',
						'default'
					]
				});
			}
		);

		it(
			'rejects an identifier with fewer than three segments',
			() => {
				expect(
					() =>
						parseResourceIdentifier(
							'kjvonly/bible'
						)
				).toThrow(
					'Invalid Resource Identifier: kjvonly/bible'
				);
			}
		);

		it(
			'rejects an empty Resource Type segment',
			() => {
				expect(
					() =>
						parseResourceIdentifier(
							'kjvonly//chapters/kjvs'
						)
				).toThrow(
					'Invalid Resource Identifier: kjvonly//chapters/kjvs'
				);
			}
		);

		it(
			'rejects an empty Resource path segment',
			() => {
				expect(
					() =>
						parseResourceIdentifier(
							'kjvonly/bible/chapters//1_1'
						)
				).toThrow(
					'Invalid Resource Identifier: kjvonly/bible/chapters//1_1'
				);
			}
		);
	}
);

describe(
	'extractResourceType',
	() => {
		it(
			'extracts the first three Resource Identifier segments',
			() => {
				expect(
					extractResourceType(
						'kjvonly/bible/chapters/kjvs/1_1'
					)
				).toBe(
					'kjvonly/bible/chapters'
				);
			}
		);
	}
);

describe(
	'extractResourcePath',
	() => {
		it(
			'extracts the Resource-Type-specific path',
			() => {
				expect(
					extractResourcePath(
						'kjvonly/bible/chapters/kjvs/1_1'
					)
				).toEqual([
					'kjvs',
					'1_1'
				]);
			}
		);

		it(
			'returns an empty path for the Resource Type root',
			() => {
				expect(
					extractResourcePath(
						'kjvonly/bible/chapters'
					)
				).toEqual(
					[]
				);
			}
		);
	}
);
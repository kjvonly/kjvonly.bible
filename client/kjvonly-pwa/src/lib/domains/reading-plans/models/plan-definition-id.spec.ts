import {
	describe,
	expect,
	it
} from 'vitest';

import {
	createPlanDefinitionId,
	parsePlanDefinitionId
} from './plan-definition-id';

describe(
	'Plan Definition identity',
	() => {
		it(
			'creates and parses publisher/group/plan-key identity',
			() => {
				const id =
					createPlanDefinitionId(
						'publisher',
						'default',
						'mcheyne'
					);

				expect(
					id
				).toBe(
					'publisher/default/mcheyne'
				);

				expect(
					parsePlanDefinitionId(
						id
					)
				).toEqual({
					publisher:
						'publisher',
					group:
						'default',
					planKey:
						'mcheyne'
				});
			}
		);

		it.each([
			[
				'',
				'default',
				'mcheyne'
			],
			[
				'publisher',
				'',
				'mcheyne'
			],
			[
				'publisher',
				'default',
				''
			],
			[
				'publisher/other',
				'default',
				'mcheyne'
			]
		])(
			'rejects invalid identity segments',
			(
				publisher,
				group,
				planKey
			) => {
				expect(
					() =>
						createPlanDefinitionId(
							publisher,
							group,
							planKey
						)
				).toThrow();
			}
		);

		it.each([
			'',
			'publisher/default',
			'publisher/default/mcheyne/extra',
			'publisher//mcheyne'
		])(
			'rejects invalid serialized identity %s',
			(id) => {
				expect(
					() =>
						parsePlanDefinitionId(
							id
						)
				).toThrow();
			}
		);
	}
);

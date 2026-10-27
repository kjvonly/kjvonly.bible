import {
	describe,
	expect,
	it,
	vi
} from 'vitest';

import type {
	PlanDefinition
} from '../models/plan-definition';

import {
	PlanDefinitionsService
} from './plan-definitions.service';

const MCHEYNE:
	PlanDefinition = {
		id:
			'publisher-a/default/mcheyne',

		name:
			'MCheyne',

		description:
			'Read through the Bible.',

		encodedReadings: [
			'1_1'
		]
	};

const PROVERBS:
	PlanDefinition = {
		id:
			'publisher-a/default/proverbs',

		name:
			'Proverbs',

		description:
			'Read Proverbs.',

		encodedReadings: [
			'20_1'
		]
	};

const COMMUNITY:
	PlanDefinition = {
		id:
			'publisher-b/community/community-plan',

		name:
			'Community Plan',

		description:
			'A separately installed plan.',

		encodedReadings: [
			'40_1'
		]
	};

describe(
	'PlanDefinitionsService',
	() => {
		it(
			'gets one installed Plan Definition directly by application id',
			async () => {
				const get =
					vi.fn()
						.mockResolvedValue(
							MCHEYNE
						);

				const getAll =
					vi.fn();

				const service =
					new PlanDefinitionsService({
						get,
						getAll
					});

				await expect(
					service.get(
						MCHEYNE.id
					)
				).resolves.toBe(
					MCHEYNE
				);

				expect(
					get
				).toHaveBeenCalledWith(
					MCHEYNE.id
				);

				expect(
					getAll
				).not.toHaveBeenCalled();
			}
		);

		it(
			'lists every installed Plan Definition regardless of publisher or group',
			async () => {
				const definitions = [
					MCHEYNE,
					PROVERBS,
					COMMUNITY
				];

				const getAll =
					vi.fn()
						.mockResolvedValue(
							definitions
						);

				const service =
					new PlanDefinitionsService({
						get:
							vi.fn(),
						getAll
					});

				await expect(
					service.list()
				).resolves.toEqual(
					definitions
				);

				expect(
					getAll
				).toHaveBeenCalledOnce();
			}
		);

		it(
			'returns an empty list when no Plan Definitions are installed',
			async () => {
				const service =
					new PlanDefinitionsService({
						get:
							vi.fn(),
						getAll:
							vi.fn()
								.mockResolvedValue([])
					});

				await expect(
					service.list()
				).resolves.toEqual([]);
			}
		);
	}
);
